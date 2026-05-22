import type { LeaderboardEntry, PlayerUpgrades, UserProfile } from "./types";
import { getSupabase, isCloudEnabled } from "./supabaseClient";

const USERS_KEY = "kolya_users_v2";
const LEADERBOARD_KEY = "kolya_leaderboard_v2";
const SESSION_KEY = "kolya_session_v3";

const DEFAULT_UPGRADES: PlayerUpgrades = {
  maxHp: 0, waterCap: 0, speed: 0, stinkPower: 0, alienCdReduce: 0, sabDmg: 0,
};

export interface Session {
  username: string;
  passwordHash: string;
}

export function hashPassword(pw: string): string {
  return btoa(unescape(encodeURIComponent(pw + "_kolya_salt")));
}

export function isServerMode(): boolean {
  return isCloudEnabled;
}

function saveSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  const upgrades = (row.upgrades as PlayerUpgrades) ?? { ...DEFAULT_UPGRADES };
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    totalCoins: Number(row.total_coins ?? 0),
    upgrades: { ...DEFAULT_UPGRADES, ...upgrades },
    gamesPlayed: Number(row.games_played ?? 0),
    bestScore: Number(row.best_score ?? 0),
  };
}

// --- LOCAL FALLBACK ---

function loadUsers(): Record<string, UserProfile> {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    const out: Record<string, UserProfile> = {};
    for (const [k, v] of Object.entries(raw)) {
      const p = v as UserProfile;
      out[k] = { ...p, passwordHash: p.passwordHash ?? (p as unknown as { password_hash?: string }).password_hash ?? "" };
    }
    return out;
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserProfile>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function localRegister(username: string, password: string): { ok: boolean; error?: string } {
  const name = username.trim();
  const h = hashPassword(password);
  if (name.length < 2) return { ok: false, error: "Имя минимум 2 символа" };
  if (password.length < 3) return { ok: false, error: "Пароль минимум 3 символа" };
  const users = loadUsers();
  const key = name.toLowerCase();
  if (users[key]) return { ok: false, error: "Игрок уже есть" };
  users[key] = {
    username: name, passwordHash: h, totalCoins: 0,
    upgrades: { ...DEFAULT_UPGRADES }, gamesPlayed: 0, bestScore: 0,
  };
  saveUsers(users);
  saveSession({ username: key, passwordHash: h });
  return { ok: true };
}

function localLogin(username: string, password: string): { ok: boolean; error?: string } {
  const key = username.trim().toLowerCase();
  const h = hashPassword(password);
  const u = loadUsers()[key];
  if (!u) return { ok: false, error: "Нет такого игрока" };
  if (u.passwordHash !== h) return { ok: false, error: "Неверный пароль" };
  saveSession({ username: key, passwordHash: h });
  return { ok: true };
}

// --- CLOUD ---

async function cloudRegister(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: "Сервер недоступен" };
  const h = hashPassword(password);
  const { data, error } = await sb.rpc("register_user", {
    p_username: username,
    p_password_hash: h,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) return { ok: false, error: res.error ?? "Ошибка" };
  saveSession({ username: username.trim().toLowerCase(), passwordHash: h });
  return { ok: true };
}

async function cloudLogin(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: "Сервер недоступен" };
  const h = hashPassword(password);
  const { data, error } = await sb.rpc("login_user", {
    p_username: username,
    p_password_hash: h,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) return { ok: false, error: res.error ?? "Ошибка входа" };
  saveSession({ username: username.trim().toLowerCase(), passwordHash: h });
  return { ok: true };
}

async function cloudFetchProfile(session: Session): Promise<UserProfile | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_profile", {
    p_username: session.username,
    p_password_hash: session.passwordHash,
  });
  if (error || !data) return null;
  const res = data as { ok: boolean; profile?: Record<string, unknown> };
  if (!res.ok || !res.profile) return null;
  return rowToProfile(res.profile);
}

async function cloudSaveProfile(profile: UserProfile, session: Session): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.rpc("update_profile", {
    p_username: session.username,
    p_password_hash: session.passwordHash,
    p_total_coins: profile.totalCoins,
    p_upgrades: profile.upgrades,
    p_games_played: profile.gamesPlayed,
    p_best_score: profile.bestScore,
  });
  if (error) return false;
  return (data as { ok: boolean }).ok;
}

// --- PUBLIC API ---

export async function register(username: string, password: string) {
  if (isCloudEnabled) return cloudRegister(username, password);
  return localRegister(username, password);
}

export async function login(username: string, password: string) {
  if (isCloudEnabled) return cloudLogin(username, password);
  return localLogin(username, password);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const session = getSession();
  if (!session) return null;

  if (isCloudEnabled) {
    return cloudFetchProfile(session);
  }

  const u = loadUsers()[session.username];
  if (!u || u.passwordHash !== session.passwordHash) return null;
  return u;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const session = getSession();
  if (!session) return;

  if (isCloudEnabled) {
    await cloudSaveProfile(profile, session);
    return;
  }

  const users = loadUsers();
  users[profile.username.toLowerCase()] = profile;
  saveUsers(users);
}

export async function buyUpgrade(id: keyof PlayerUpgrades, cost: number): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || u.totalCoins < cost) return false;
  u.totalCoins -= cost;
  u.upgrades[id] += 1;
  await saveUserProfile(u);
  return true;
}

export async function recordGameEnd(score: number, wave: number, coinsEarned: number): Promise<void> {
  const session = getSession();
  const name = session ? (await fetchCurrentUser())?.username ?? "Гость" : "Гость";

  if (isCloudEnabled) {
    const sb = await getSupabase();
    if (sb) await sb.rpc("add_score", { p_username: name, p_score: score, p_wave: wave });
  } else {
    addLeaderboardEntryLocal(name, score, wave);
  }

  if (!session) return;
  const u = await fetchCurrentUser();
  if (!u) return;
  u.gamesPlayed += 1;
  u.totalCoins += coinsEarned;
  u.bestScore = Math.max(u.bestScore, score);
  await saveUserProfile(u);
}

function addLeaderboardEntryLocal(username: string, score: number, wave: number) {
  const entries = getLeaderboardLocal();
  entries.push({ username, score, wave, date: new Date().toISOString() });
  entries.sort((a, b) => b.score - a.score);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
}

function getLeaderboardLocal(): LeaderboardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (isCloudEnabled) {
    const sb = await getSupabase();
    if (!sb) return [];
    const { data, error } = await sb.rpc("get_leaderboard");
    if (error || !data) return [];
    const rows = data as { username: string; score: number; wave: number; created_at: string }[];
    if (!Array.isArray(rows)) return [];
    return rows.map(r => ({
      username: r.username,
      score: r.score,
      wave: r.wave,
      date: r.created_at,
    }));
  }
  return getLeaderboardLocal();
}

export async function getAppliedUpgrades(): Promise<PlayerUpgrades> {
  const u = await fetchCurrentUser();
  return u?.upgrades ?? { ...DEFAULT_UPGRADES };
}
