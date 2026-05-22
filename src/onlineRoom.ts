/**
 * Онлайн: хост + группа. Supabase DB (между ПК) + broadcast + localStorage (запас).
 */
import { getSupabase, isCloudEnabled } from "./supabaseClient";

export interface RoomMember {
  username: string;
  isHost: boolean;
}

export interface PeerState {
  username: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  tick: number;
  isDead?: boolean;
  skinId?: string;
}

export interface RoomSnapshot {
  code: string;
  host: string;
  members: string[];
  seed: number | null;
  started: boolean;
  updatedAt: number;
  peers: Record<string, PeerState>;
  spawnX?: number;
  spawnY?: number;
}

type RoomListener = (room: RoomSnapshot) => void;
export interface GameStartPayload {
  seed: number;
  spawnX: number;
  spawnY: number;
}

type StartListener = (payload: GameStartPayload) => void;

const LS_PREFIX = "kolya_online_room_";
const POLL_MS = 400;

function roomKey(code: string) {
  return LS_PREFIX + code;
}

export function createRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readRoom(code: string): RoomSnapshot | null {
  try {
    const raw = localStorage.getItem(roomKey(code));
    if (!raw) return null;
    const d = JSON.parse(raw) as RoomSnapshot;
    if (Date.now() - d.updatedAt > 600_000) return null;
    return d;
  } catch {
    return null;
  }
}

function writeRoom(room: RoomSnapshot) {
  localStorage.setItem(roomKey(room.code), JSON.stringify(room));
}

let activeRoom: OnlineRoom | null = null;

let onRevivedListener: (() => void) | null = null;

export function setOnRevivedListener(cb: (() => void) | null) {
  onRevivedListener = cb;
}

export function getActiveRoom(): OnlineRoom | null {
  return activeRoom;
}

async function fetchRoomFromDb(code: string): Promise<RoomSnapshot | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("online_rooms")
    .select("code, host, members, game_seed, started, updated_at, spawn_x, spawn_y, peers")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  const members = Array.isArray(data.members) ? (data.members as string[]) : [];
  return {
    code: data.code as string,
    host: data.host as string,
    members,
    seed: data.game_seed != null ? Number(data.game_seed) : null,
    started: Boolean(data.started),
    updatedAt: new Date(data.updated_at as string).getTime(),
    spawnX: data.spawn_x != null ? Number(data.spawn_x) : undefined,
    spawnY: data.spawn_y != null ? Number(data.spawn_y) : undefined,
    peers: (data.peers && typeof data.peers === "object" && !Array.isArray(data.peers))
      ? (data.peers as Record<string, PeerState>)
      : {},
  };
}

async function cleanupStaleRooms(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  await sb.from("online_rooms").delete().lt("updated_at", cutoff);
}

async function persistRoomToDb(snap: RoomSnapshot): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("online_rooms").upsert({
    code: snap.code,
    host: snap.host,
    members: snap.members,
    game_seed: snap.seed,
    started: snap.started,
    spawn_x: snap.spawnX ?? null,
    spawn_y: snap.spawnY ?? null,
    peers: snap.peers,
    updated_at: new Date().toISOString(),
  });
}

function waitChannelSubscribe(channel: { subscribe: (cb?: (s: string) => void) => unknown }) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("subscribe timeout")), 8000);
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });
}

export class OnlineRoom {
  readonly code: string;
  readonly username: string;
  readonly isHost: boolean;

  private snapshot: RoomSnapshot;
  private bc: BroadcastChannel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private hostSyncTimer: ReturnType<typeof setInterval> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sbChannel: any = null;
  private roomListeners = new Set<RoomListener>();
  private startListeners = new Set<StartListener>();
  private closed = false;
  private gameStarted = false;

  private constructor(code: string, username: string, isHost: boolean, snap: RoomSnapshot) {
    this.code = code;
    this.username = username;
    this.isHost = isHost;
    this.snapshot = snap;
  }

  get members(): RoomMember[] {
    return this.snapshot.members.map(u => ({
      username: u,
      isHost: u === this.snapshot.host,
    }));
  }

  get started(): boolean {
    return this.snapshot.started;
  }

  onRoomChange(cb: RoomListener) {
    this.roomListeners.add(cb);
    cb({ ...this.snapshot, members: [...this.snapshot.members] });
    return () => this.roomListeners.delete(cb);
  }

  onGameStart(cb: StartListener) {
    this.startListeners.add(cb);
    if (this.snapshot.started && this.snapshot.seed != null) {
      cb({
        seed: this.snapshot.seed,
        spawnX: this.snapshot.spawnX ?? 24,
        spawnY: this.snapshot.spawnY ?? 24,
      });
    }
    return () => this.startListeners.delete(cb);
  }

  private emitRoom() {
    for (const cb of this.roomListeners) {
      cb({ ...this.snapshot, members: [...this.snapshot.members] });
    }
  }

  private emitStart(seed: number, spawnX?: number, spawnY?: number) {
    if (this.gameStarted) return;
    this.gameStarted = true;
    const payload: GameStartPayload = {
      seed,
      spawnX: spawnX ?? 24,
      spawnY: spawnY ?? 24,
    };
    for (const cb of this.startListeners) cb(payload);
  }

  private async pushState() {
    this.snapshot.updatedAt = Date.now();
    writeRoom(this.snapshot);
    await persistRoomToDb(this.snapshot);
  }

  private applySnapshot(remote: RoomSnapshot, fromStart = false) {
    if (this.closed) return;
    const wasStarted = this.snapshot.started;
    const prevUpdated = this.snapshot.updatedAt;
    if (remote.updatedAt < prevUpdated && !fromStart) return;

    this.snapshot = {
      ...this.snapshot,
      host: remote.host || this.snapshot.host,
      members: [...new Set([...remote.members, remote.host, this.snapshot.host].filter(Boolean))],
      seed: remote.seed ?? this.snapshot.seed,
      started: remote.started || this.snapshot.started,
      spawnX: remote.spawnX ?? this.snapshot.spawnX,
      spawnY: remote.spawnY ?? this.snapshot.spawnY,
      updatedAt: remote.updatedAt,
    };
    writeRoom(this.snapshot);
    this.emitRoom();
    if (!wasStarted && this.snapshot.started && this.snapshot.seed != null) {
      this.emitStart(this.snapshot.seed, this.snapshot.spawnX, this.snapshot.spawnY);
    }
  }

  private applyRemote(data: Partial<RoomSnapshot> & { type?: string; seed?: number; from?: string; target?: string; spawnX?: number; spawnY?: number }) {
    if (this.closed) return;

    if (data.type === "revive" && data.target === this.username) {
      onRevivedListener?.();
      return;
    }

    if (data.type === "game_start" && data.seed != null) {
      this.snapshot.started = true;
      this.snapshot.seed = data.seed;
      Object.assign(this.snapshot, { spawnX: data.spawnX, spawnY: data.spawnY });
      void this.pushState();
      this.emitRoom();
      this.emitStart(data.seed, data.spawnX, data.spawnY);
      return;
    }

    if (data.type === "join" && data.from) {
      const merged = new Set(this.snapshot.members);
      merged.add(data.from);
      if (this.snapshot.host) merged.add(this.snapshot.host);
      this.snapshot.members = [...merged];
      void this.pushState();
      this.emitRoom();
      if (this.isHost) {
        this.broadcast({ members: this.snapshot.members, host: this.snapshot.host });
      }
      return;
    }

    if (data.host) this.snapshot.host = data.host as string;
    if (data.members) {
      const merged = new Set([...this.snapshot.members, ...data.members]);
      if (this.snapshot.host) merged.add(this.snapshot.host);
      this.snapshot.members = [...merged];
    }
    if (data.type === "peer" && data.peers) {
      this.snapshot.peers = { ...this.snapshot.peers, ...data.peers };
      return;
    }
    if (data.peers) {
      this.snapshot.peers = { ...this.snapshot.peers, ...data.peers };
      return;
    }
    if (data.started != null) this.snapshot.started = data.started;
    if (data.seed != null) this.snapshot.seed = data.seed;
    if (data.spawnX != null) this.snapshot.spawnX = data.spawnX;
    if (data.spawnY != null) this.snapshot.spawnY = data.spawnY;

    void this.pushState();
    this.emitRoom();
    if (this.snapshot.started && this.snapshot.seed != null) {
      const s = this.snapshot as RoomSnapshot & { spawnX?: number; spawnY?: number };
      this.emitStart(this.snapshot.seed, s.spawnX, s.spawnY);
    }
  }

  sendRevive(targetUsername: string) {
    this.broadcast({ type: "revive", target: targetUsername, from: this.username });
  }

  private broadcast(payload: Record<string, unknown>) {
    this.bc?.postMessage({ code: this.code, ...payload });
    void this.sbChannel?.send({
      type: "broadcast",
      event: "room",
      payload: { ...payload, from: this.username },
    });
  }

  private startLocalSync() {
    try {
      this.bc = new BroadcastChannel(`kolya-room-${this.code}`);
      this.bc.onmessage = (ev: MessageEvent) => {
        const d = ev.data as Record<string, unknown>;
        if (d.code !== this.code) return;
        this.applyRemote(d as Partial<RoomSnapshot>);
      };
    } catch {
      this.bc = null;
    }

    this.pollTimer = setInterval(() => {
      void this.pollRemote();
    }, POLL_MS);
  }

  private async pollRemote() {
    const dbRoom = await fetchRoomFromDb(this.code);
    if (dbRoom) {
      this.applySnapshot({
        ...dbRoom,
        peers: { ...this.snapshot.peers, ...dbRoom.peers },
      });
      return;
    }
    const local = readRoom(this.code);
    if (local) {
      this.applySnapshot({ ...local, peers: this.snapshot.peers });
    }
  }

  private async startSupabase() {
    const sb = await getSupabase();
    if (!sb) return;

    const channel = sb.channel(`kolya_room:${this.code}`, {
      config: { broadcast: { self: true } },
    });

    channel.on("broadcast", { event: "room" }, ({ payload }: { payload: Record<string, unknown> }) => {
      const p = payload as Partial<RoomSnapshot> & { type?: string; from?: string };
      if (p.type === "game_start" || p.type === "join" || p.type === "revive") {
        this.applyRemote(p);
        return;
      }
      if (p.type === "peer" && p.peers) {
        this.snapshot.peers = {
          ...this.snapshot.peers,
          ...(p.peers as Record<string, PeerState>),
        };
        return;
      }
      if (p.from === this.username) return;
      this.applyRemote(p);
    });

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "online_rooms", filter: `code=eq.${this.code}` },
      (payload: { new: Record<string, unknown> }) => {
        const n = payload.new;
        if (!n) return;
        const members = Array.isArray(n.members) ? (n.members as string[]) : [];
        const dbPeers = (n.peers && typeof n.peers === "object" && !Array.isArray(n.peers))
          ? (n.peers as Record<string, PeerState>)
          : {};
        this.applySnapshot({
          code: this.code,
          host: n.host as string,
          members,
          seed: n.game_seed != null ? Number(n.game_seed) : null,
          started: Boolean(n.started),
          spawnX: n.spawn_x != null ? Number(n.spawn_x) : undefined,
          spawnY: n.spawn_y != null ? Number(n.spawn_y) : undefined,
          updatedAt: new Date(n.updated_at as string).getTime(),
          peers: { ...this.snapshot.peers, ...dbPeers },
        });
      },
    );

    try {
      await waitChannelSubscribe(channel);
    } catch {
      console.warn("Realtime: подписка не успела, работаем через опрос БД");
    }
    this.sbChannel = channel;
  }

  static async createHost(username: string): Promise<OnlineRoom> {
    await cleanupStaleRooms();
    await OnlineRoom.leave();
    const code = createRoomCode();
    const snap: RoomSnapshot = {
      code,
      host: username,
      members: [username],
      seed: null,
      started: false,
      updatedAt: Date.now(),
      peers: {},
    };
    writeRoom(snap);
    await persistRoomToDb(snap);

    const room = new OnlineRoom(code, username, true, snap);
    room.startLocalSync();
    await room.startSupabase();
    activeRoom = room;
    room.broadcast({ members: snap.members, host: username });
    room.hostSyncTimer = setInterval(() => {
      if (!room.closed) {
        room.broadcast({ members: room.snapshot.members, host: room.snapshot.host });
        room.broadcast({ type: "peer", peers: room.snapshot.peers });
        void room.pushState();
        void cleanupStaleRooms();
      }
    }, 1500);
    return room;
  }

  static async join(username: string, code: string): Promise<OnlineRoom | null> {
    await cleanupStaleRooms();
    const trimmed = code.trim();
    if (trimmed.length < 4) return null;

    let snap = await fetchRoomFromDb(trimmed);
    if (!snap) snap = readRoom(trimmed);
    if (!snap) {
      if (!isCloudEnabled) return null;
      snap = {
        code: trimmed,
        host: "",
        members: [username],
        seed: null,
        started: false,
        updatedAt: Date.now(),
        peers: {},
      };
    }

    if (!snap.members.includes(username)) {
      snap.members = [...snap.members, username];
    }
    snap.updatedAt = Date.now();

    await OnlineRoom.leave();
    const room = new OnlineRoom(trimmed, username, snap.host === username, snap);
    writeRoom(snap);
    await persistRoomToDb(snap);
    room.startLocalSync();
    await room.startSupabase();
    activeRoom = room;
    room.broadcast({ type: "join", from: username, members: snap.members });
    return room;
  }

  static async leave() {
    if (activeRoom) {
      await activeRoom.destroy();
      activeRoom = null;
    }
  }

  private async destroy() {
    this.closed = true;
    const code = this.code;
    const isHost = this.isHost;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.hostSyncTimer) clearInterval(this.hostSyncTimer);
    this.bc?.close();
    if (this.sbChannel) {
      const sb = await getSupabase();
      if (sb) void sb.removeChannel(this.sbChannel);
    }
    if (isHost) {
      const sb = await getSupabase();
      if (sb) await sb.from("online_rooms").delete().eq("code", code);
      try { localStorage.removeItem(roomKey(code)); } catch { /* ignore */ }
    }
    this.roomListeners.clear();
    this.startListeners.clear();
  }

  hostStartGame(spawnX: number, spawnY: number): number {
    if (!this.isHost) return 0;
    const seed = Date.now() + Math.floor(Math.random() * 1_000_000);
    this.snapshot.started = true;
    this.snapshot.seed = seed;
    this.snapshot.spawnX = spawnX;
    this.snapshot.spawnY = spawnY;
    void this.pushState();
    this.broadcast({
      type: "game_start", seed, spawnX, spawnY,
      started: true, members: this.snapshot.members, host: this.snapshot.host,
    });
    this.emitRoom();
    this.emitStart(seed, spawnX, spawnY);
    return seed;
  }

  sendPosition(
    x: number, y: number, hp: number, maxHp: number, tick: number,
    isDead = false, skinId?: string,
  ) {
    const peer: PeerState = { username: this.username, x, y, hp, maxHp, tick, isDead, skinId };
    this.snapshot.peers[this.username] = peer;
    this.broadcast({ type: "peer", peers: { [this.username]: peer } });
  }

  getPartySize(): number {
    return Math.max(1, this.snapshot.members.length);
  }

  getOtherPeers(): PeerState[] {
    return Object.values(this.snapshot.peers).filter(p => p.username !== this.username);
  }
}

export function isOnlineMode(): boolean {
  return activeRoom != null;
}
