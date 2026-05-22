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
}

export interface RoomSnapshot {
  code: string;
  host: string;
  members: string[];
  seed: number | null;
  started: boolean;
  updatedAt: number;
  peers: Record<string, PeerState>;
}

type RoomListener = (room: RoomSnapshot) => void;
type StartListener = (seed: number) => void;

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

export function getActiveRoom(): OnlineRoom | null {
  return activeRoom;
}

async function fetchRoomFromDb(code: string): Promise<RoomSnapshot | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("online_rooms")
    .select("code, host, members, game_seed, started, updated_at")
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
    peers: {},
  };
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
      cb(this.snapshot.seed);
    }
    return () => this.startListeners.delete(cb);
  }

  private emitRoom() {
    for (const cb of this.roomListeners) {
      cb({ ...this.snapshot, members: [...this.snapshot.members] });
    }
  }

  private emitStart(seed: number) {
    if (this.gameStarted) return;
    this.gameStarted = true;
    for (const cb of this.startListeners) cb(seed);
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
      updatedAt: remote.updatedAt,
    };
    writeRoom(this.snapshot);
    this.emitRoom();
    if (!wasStarted && this.snapshot.started && this.snapshot.seed != null) {
      this.emitStart(this.snapshot.seed);
    }
  }

  private applyRemote(data: Partial<RoomSnapshot> & { type?: string; seed?: number; from?: string }) {
    if (this.closed) return;

    if (data.type === "game_start" && data.seed != null) {
      this.snapshot.started = true;
      this.snapshot.seed = data.seed;
      void this.pushState();
      this.emitRoom();
      this.emitStart(data.seed);
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
    if (data.peers) {
      this.snapshot.peers = { ...this.snapshot.peers, ...data.peers };
    }
    if (data.started != null) this.snapshot.started = data.started;
    if (data.seed != null) this.snapshot.seed = data.seed;

    void this.pushState();
    this.emitRoom();
    if (this.snapshot.started && this.snapshot.seed != null) {
      this.emitStart(this.snapshot.seed);
    }
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
      this.applySnapshot({ ...dbRoom, peers: this.snapshot.peers });
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
      if (p.type === "game_start" || p.type === "join") {
        this.applyRemote(p);
        return;
      }
      if (p.type === "peer" && p.peers) {
        this.applyRemote({ peers: p.peers as Record<string, PeerState> });
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
        this.applySnapshot({
          code: this.code,
          host: n.host as string,
          members,
          seed: n.game_seed != null ? Number(n.game_seed) : null,
          started: Boolean(n.started),
          updatedAt: new Date(n.updated_at as string).getTime(),
          peers: this.snapshot.peers,
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
        void room.pushState();
      }
    }, 2000);
    return room;
  }

  static async join(username: string, code: string): Promise<OnlineRoom | null> {
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
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.hostSyncTimer) clearInterval(this.hostSyncTimer);
    this.bc?.close();
    if (this.sbChannel) {
      const sb = await getSupabase();
      if (sb) void sb.removeChannel(this.sbChannel);
    }
    this.roomListeners.clear();
    this.startListeners.clear();
  }

  hostStartGame(): number {
    if (!this.isHost) return 0;
    const seed = Date.now() + Math.floor(Math.random() * 1_000_000);
    this.snapshot.started = true;
    this.snapshot.seed = seed;
    void this.pushState();
    this.broadcast({ type: "game_start", seed, started: true, members: this.snapshot.members, host: this.snapshot.host });
    this.emitRoom();
    this.emitStart(seed);
    return seed;
  }

  sendPosition(x: number, y: number, hp: number, maxHp: number, tick: number) {
    const peer: PeerState = { username: this.username, x, y, hp, maxHp, tick };
    this.snapshot.peers[this.username] = peer;
    if (tick % 8 === 0) {
      this.broadcast({ type: "peer", peers: { [this.username]: peer } });
    }
  }

  getOtherPeers(): PeerState[] {
    return Object.values(this.snapshot.peers).filter(p => p.username !== this.username);
  }
}

export function isOnlineMode(): boolean {
  return activeRoom != null;
}
