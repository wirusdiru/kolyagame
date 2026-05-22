import { getSupabase, isCloudEnabled } from "./supabaseClient";

export interface CoopPeer {
  username: string;
  x: number;
  y: number;
  hp: number;
  tick: number;
}

const ROOM_PREFIX = "kolya_room_";

export function createRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Локальная «комната» для теста в одном браузере */
export function saveLocalRoom(code: string, host: string, peer: CoopPeer | null) {
  localStorage.setItem(ROOM_PREFIX + code, JSON.stringify({ host, peer, at: Date.now() }));
}

export function loadLocalRoom(code: string): { host: string; peer: CoopPeer | null } | null {
  try {
    const raw = localStorage.getItem(ROOM_PREFIX + code);
    if (!raw) return null;
    const d = JSON.parse(raw) as { host: string; peer: CoopPeer | null; at: number };
    if (Date.now() - d.at > 120_000) return null;
    return { host: d.host, peer: d.peer };
  } catch {
    return null;
  }
}

export type CoopChannel = {
  broadcast: (payload: Record<string, unknown>) => void;
  unsubscribe: () => void;
};

export async function joinCoopChannel(
  roomCode: string,
  username: string,
  onMessage: (payload: Record<string, unknown>) => void,
): Promise<CoopChannel | null> {
  if (!isCloudEnabled) return null;
  const sb = await getSupabase();
  if (!sb) return null;

  const channel = sb.channel(`coop:${roomCode}`, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "state" }, ({ payload }) => {
    onMessage(payload as Record<string, unknown>);
  });

  await channel.subscribe();

  return {
    broadcast: (payload) => {
      void channel.send({ type: "broadcast", event: "state", payload: { ...payload, from: username } });
    },
    unsubscribe: () => {
      void sb.removeChannel(channel);
    },
  };
}
