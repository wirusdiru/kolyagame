/**
 * Онлайн-группа: хост создаёт, участники присоединяются.
 * Supabase Realtime + запасной канал BroadcastChannel/localStorage (вкладки на одном ПК).
 */
import { getSupabase } from "./supabaseClient";

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
const POLL_MS = 280;

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
    if (Date.now() - d.updatedAt > 300_000) return null;
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
    cb(this.snapshot);
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
    for (const cb of this.roomListeners) cb({ ...this.snapshot, members: [...this.snapshot.members] });
  }

  private emitStart(seed: number) {
    for (const cb of this.startListeners) cb(seed);
  }

  private applyRemote(data: Partial<RoomSnapshot> & { type?: string; seed?: number; from?: string }) {
    if (this.closed) return;
    if (data.type === "game_start" && data.seed != null) {
      this.snapshot = { ...this.snapshot, started: true, seed: data.seed, updatedAt: Date.now() };
      writeRoom(this.snapshot);
      this.emitRoom();
      this.emitStart(data.seed);
      return;
    }
    if (data.type === "join" && data.from) {
      const merged = new Set(this.snapshot.members);
      merged.add(data.from);
      if (this.snapshot.host) merged.add(this.snapshot.host);
      this.snapshot.members = [...merged];
      this.snapshot.updatedAt = Date.now();
      writeRoom(this.snapshot);
      this.emitRoom();
      if (this.isHost) {
        this.broadcast({ members: this.snapshot.members, host: this.snapshot.host });
      }
      return;
    }
    if (data.host && !this.snapshot.host) {
      this.snapshot.host = data.host as string;
    }
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
    this.snapshot.updatedAt = Date.now();
    writeRoom(this.snapshot);
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
      const remote = readRoom(this.code);
      if (!remote) return;
      if (remote.updatedAt > this.snapshot.updatedAt) {
        const wasStarted = this.snapshot.started;
        this.snapshot = { ...remote };
        this.emitRoom();
        if (!wasStarted && remote.started && remote.seed != null) {
          this.emitStart(remote.seed);
        }
      }
    }, POLL_MS);
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
      if (p.from === this.username) return;
      this.applyRemote(p);
    });

    await channel.subscribe();
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
    const room = new OnlineRoom(code, username, true, snap);
    room.startLocalSync();
    await room.startSupabase();
    activeRoom = room;
    room.broadcast({ members: snap.members, host: username });
    room.hostSyncTimer = setInterval(() => {
      if (!room.closed) {
        room.broadcast({ members: room.snapshot.members, host: room.snapshot.host });
      }
    }, 2000);
    return room;
  }

  static async join(username: string, code: string): Promise<OnlineRoom | null> {
    const trimmed = code.trim();
    if (trimmed.length < 4) return null;

    let snap = readRoom(trimmed);
    if (!snap) {
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
    writeRoom(snap);

    await OnlineRoom.leave();
    const room = new OnlineRoom(trimmed, username, snap.host === username, snap);
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

  /** Хост запускает игру для всех */
  hostStartGame(): number {
    if (!this.isHost) return 0;
    const seed = Date.now() + Math.floor(Math.random() * 1_000_000);
    this.snapshot = {
      ...this.snapshot,
      started: true,
      seed,
      updatedAt: Date.now(),
    };
    writeRoom(this.snapshot);
    this.broadcast({ type: "game_start", seed, started: true, members: this.snapshot.members });
    this.emitRoom();
    this.emitStart(seed);
    return seed;
  }

  sendPosition(x: number, y: number, hp: number, maxHp: number, tick: number) {
    const peer: PeerState = { username: this.username, x, y, hp, maxHp, tick };
    this.snapshot.peers[this.username] = peer;
    if (this.isHost || tick % 3 === 0) {
      this.snapshot.updatedAt = Date.now();
      writeRoom(this.snapshot);
      this.broadcast({ peers: { [this.username]: peer } });
    }
  }

  getOtherPeers(): PeerState[] {
    return Object.values(this.snapshot.peers).filter(p => p.username !== this.username);
  }
}

export function isOnlineMode(): boolean {
  return activeRoom != null;
}
