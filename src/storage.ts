import type {
  AbilityId, FriendEntry, KolyaSkinId, LeaderboardEntry,
  OwnedAbilities, PlayerUpgrades, SabSkinId, UserProfile,
} from "./types";
import { DEFAULT_ABILITIES } from "./constants";
import { getSupabase, isCloudEnabled } from "./supabaseClient";

const USERS_KEY = "kolya_users_v3";
const LEADERBOARD_KEY = "kolya_leaderboard_v2";
const SESSION_KEY = "kolya_session_v3";
const EXTRAS_KEY = "kolya_extras_v1";

const DEFAULT_UPGRADES: PlayerUpgrades = {
  maxHp: 0, waterCap: 0, speed: 0, stinkPower: 0, alienCdReduce: 0, sabDmg: 0,
  waterEfficiency: 0, regenBoost: 0, alienDuration: 0,
};

/** Скины/способности в upgrades json — синхронизируются с Supabase */
interface UpgradesPayload extends PlayerUpgrades {
  __meta?: {
    abilities?: OwnedAbilities;
    ownedKolyaSkins?: KolyaSkinId[];
    ownedSabSkins?: SabSkinId[];
    equippedKolyaSkin?: KolyaSkinId;
    equippedSabSkin?: SabSkinId;
    friends?: FriendEntry[];
  };
}

function packUpgrades(profile: UserProfile): UpgradesPayload {
  return {
    ...profile.upgrades,
    __meta: {
      abilities: profile.abilities,
      ownedKolyaSkins: profile.ownedKolyaSkins,
      ownedSabSkins: profile.ownedSabSkins,
      equippedKolyaSkin: profile.equippedKolyaSkin,
      equippedSabSkin: profile.equippedSabSkin,
      friends: profile.friends,
    },
  };
}

function unpackUpgrades(raw: UpgradesPayload): {
  upgrades: PlayerUpgrades;
  meta: UpgradesPayload["__meta"];
} {
  const { __meta, ...upgrades } = raw;
  return { upgrades: { ...DEFAULT_UPGRADES, ...upgrades }, meta: __meta };
}

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

function defaultProfile(username: string, passwordHash: string): UserProfile {
  return {
    username,
    passwordHash,
    totalCoins: 0,
    upgrades: { ...DEFAULT_UPGRADES },
    abilities: { ...DEFAULT_ABILITIES },
    ownedKolyaSkins: ["default"],
    ownedSabSkins: ["default"],
    equippedKolyaSkin: "default",
    equippedSabSkin: "default",
    friends: [],
    gamesPlayed: 0,
    bestScore: 0,
  };
}

function loadExtras(): Record<string, Partial<UserProfile>> {
  try {
    return JSON.parse(localStorage.getItem(EXTRAS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveExtras(username: string, data: Partial<UserProfile>) {
  const all = loadExtras();
  all[username.toLowerCase()] = { ...all[username.toLowerCase()], ...data };
  localStorage.setItem(EXTRAS_KEY, JSON.stringify(all));
}

function migrateSkins(profile: UserProfile): UserProfile {
  const skins = profile.ownedKolyaSkins.map(s =>
    (s as string) === "toxic_glow" ? "kolya1" : s,
  );
  const eq = profile.equippedKolyaSkin === ("toxic_glow" as KolyaSkinId)
    ? "kolya1" as KolyaSkinId
    : profile.equippedKolyaSkin;
  return { ...profile, ownedKolyaSkins: skins, equippedKolyaSkin: eq };
}

function mergeExtras(profile: UserProfile): UserProfile {
  const ex = loadExtras()[profile.username.toLowerCase()];
  const base = migrateSkins(profile);
  if (!ex) return base;
  return migrateSkins({
    ...base,
    abilities: { ...DEFAULT_ABILITIES, ...base.abilities, ...ex.abilities },
    ownedKolyaSkins: ex.ownedKolyaSkins ?? base.ownedKolyaSkins,
    ownedSabSkins: ex.ownedSabSkins ?? base.ownedSabSkins,
    equippedKolyaSkin: ex.equippedKolyaSkin ?? base.equippedKolyaSkin,
    equippedSabSkin: ex.equippedSabSkin ?? base.equippedSabSkin,
    friends: ex.friends ?? base.friends,
  });
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  const rawUp = (row.upgrades as UpgradesPayload) ?? { ...DEFAULT_UPGRADES };
  const { upgrades, meta } = unpackUpgrades(rawUp);
  const base = defaultProfile(String(row.username), String(row.password_hash));
  return migrateSkins(mergeExtras({
    ...base,
    totalCoins: Number(row.total_coins ?? 0),
    upgrades,
    abilities: { ...DEFAULT_ABILITIES, ...meta?.abilities },
    ownedKolyaSkins: meta?.ownedKolyaSkins ?? ["default"],
    ownedSabSkins: meta?.ownedSabSkins ?? ["default"],
    equippedKolyaSkin: meta?.equippedKolyaSkin ?? "default",
    equippedSabSkin: meta?.equippedSabSkin ?? "default",
    friends: meta?.friends ?? [],
    gamesPlayed: Number(row.games_played ?? 0),
    bestScore: Number(row.best_score ?? 0),
  }));
}

function loadUsers(): Record<string, UserProfile> {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    const out: Record<string, UserProfile> = {};
    for (const [k, v] of Object.entries(raw)) {
      const p = v as UserProfile;
      out[k] = mergeExtras({
        ...defaultProfile(p.username ?? k, p.passwordHash ?? ""),
        ...p,
        upgrades: unpackUpgrades(p.upgrades as UpgradesPayload).upgrades,
        abilities: { ...DEFAULT_ABILITIES, ...p.abilities },
        ownedKolyaSkins: p.ownedKolyaSkins ?? ["default"],
        ownedSabSkins: p.ownedSabSkins ?? ["default"],
        equippedKolyaSkin: p.equippedKolyaSkin ?? "default",
        equippedSabSkin: p.equippedSabSkin ?? "default",
        friends: p.friends ?? [],
      });
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
  users[key] = defaultProfile(name, h);
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
  saveExtras(username.trim().toLowerCase(), defaultProfile(username, h));
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
  saveExtras(profile.username, {
    abilities: profile.abilities,
    ownedKolyaSkins: profile.ownedKolyaSkins,
    ownedSabSkins: profile.ownedSabSkins,
    equippedKolyaSkin: profile.equippedKolyaSkin,
    equippedSabSkin: profile.equippedSabSkin,
    friends: profile.friends,
  });
  const { data, error } = await sb.rpc("update_profile", {
    p_username: session.username,
    p_password_hash: session.passwordHash,
    p_total_coins: profile.totalCoins,
    p_upgrades: packUpgrades(profile),
    p_games_played: profile.gamesPlayed,
    p_best_score: profile.bestScore,
  });
  if (error) return false;
  return (data as { ok: boolean }).ok;
}

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

export async function buyAbility(id: AbilityId, cost: number): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || u.totalCoins < cost || u.abilities[id]) return false;
  u.totalCoins -= cost;
  u.abilities[id] = true;
  await saveUserProfile(u);
  return true;
}

export async function buyKolyaSkin(id: KolyaSkinId, cost: number): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || u.totalCoins < cost || u.ownedKolyaSkins.includes(id)) return false;
  u.totalCoins -= cost;
  u.ownedKolyaSkins.push(id);
  await saveUserProfile(u);
  return true;
}

export async function buySabSkin(id: SabSkinId, cost: number): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || u.totalCoins < cost || u.ownedSabSkins.includes(id)) return false;
  u.totalCoins -= cost;
  u.ownedSabSkins.push(id);
  await saveUserProfile(u);
  return true;
}

export async function equipKolyaSkin(id: KolyaSkinId): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || !u.ownedKolyaSkins.includes(id)) return false;
  u.equippedKolyaSkin = id;
  await saveUserProfile(u);
  return true;
}

export async function equipSabSkin(id: SabSkinId): Promise<boolean> {
  const u = await fetchCurrentUser();
  if (!u || !u.ownedSabSkins.includes(id)) return false;
  u.equippedSabSkin = id;
  await saveUserProfile(u);
  return true;
}

export async function addFriend(friendName: string): Promise<{ ok: boolean; error?: string }> {
  const u = await fetchCurrentUser();
  if (!u) return { ok: false, error: "Войди в аккаунт" };
  const name = friendName.trim();
  if (name.length < 2) return { ok: false, error: "Ник слишком короткий" };
  if (name.toLowerCase() === u.username.toLowerCase()) return { ok: false, error: "Это ты" };
  if (u.friends.some(f => f.username.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Уже в друзьях" };
  }
  if (u.friends.length >= 20) return { ok: false, error: "Макс 20 друзей" };
  u.friends.push({ username: name, addedAt: new Date().toISOString() });
  await saveUserProfile(u);
  return { ok: true };
}

export async function removeFriend(friendName: string): Promise<void> {
  const u = await fetchCurrentUser();
  if (!u) return;
  u.friends = u.friends.filter(f => f.username.toLowerCase() !== friendName.toLowerCase());
  await saveUserProfile(u);
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
  const key = username.toLowerCase();
  const existing = entries.findIndex(e => e.username.toLowerCase() === key);
  const entry = { username, score, wave, date: new Date().toISOString() };
  if (existing >= 0) {
    if (score > entries[existing].score) entries[existing] = entry;
  } else {
    entries.push(entry);
  }
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

export async function getEquippedSkins(): Promise<{ kolya: KolyaSkinId; sab: SabSkinId }> {
  const u = await fetchCurrentUser();
  return {
    kolya: u?.equippedKolyaSkin ?? "default",
    sab: u?.equippedSabSkin ?? "default",
  };
}

export async function getOwnedAbilities(): Promise<OwnedAbilities> {
  const u = await fetchCurrentUser();
  return u?.abilities ?? { ...DEFAULT_ABILITIES };
}
