import type {
  AbilityId, FriendEntry, FriendPublicStatus, FriendRequestEntry,
  KolyaSkinId, LeaderboardEntry,
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
    friendRequestsIn?: FriendRequestEntry[];
    friendRequestsOut?: FriendRequestEntry[];
    lastSeenAt?: string;
    isPlaying?: boolean;
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
      friendRequestsIn: profile.friendRequestsIn,
      friendRequestsOut: profile.friendRequestsOut,
      lastSeenAt: profile.lastSeenAt,
      isPlaying: profile.isPlaying,
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
    friendRequestsIn: [],
    friendRequestsOut: [],
    lastSeenAt: new Date().toISOString(),
    isPlaying: false,
    gamesPlayed: 0,
    bestScore: 0,
  };
}

function normalizeProfile(p: UserProfile): UserProfile {
  return {
    ...p,
    friends: p.friends ?? [],
    friendRequestsIn: p.friendRequestsIn ?? [],
    friendRequestsOut: p.friendRequestsOut ?? [],
    lastSeenAt: p.lastSeenAt ?? new Date().toISOString(),
    isPlaying: p.isPlaying ?? false,
  };
}

function hasFriend(profile: UserProfile, name: string): boolean {
  const n = name.toLowerCase();
  return profile.friends.some(f => f.username.toLowerCase() === n);
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
    friendRequestsIn: ex.friendRequestsIn ?? base.friendRequestsIn,
    friendRequestsOut: ex.friendRequestsOut ?? base.friendRequestsOut,
    lastSeenAt: ex.lastSeenAt ?? base.lastSeenAt,
    isPlaying: ex.isPlaying ?? base.isPlaying,
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
    friendRequestsIn: meta?.friendRequestsIn ?? [],
    friendRequestsOut: meta?.friendRequestsOut ?? [],
    lastSeenAt: String(row.last_seen_at ?? meta?.lastSeenAt ?? new Date().toISOString()),
    isPlaying: Boolean(row.is_playing ?? meta?.isPlaying ?? false),
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
        friendRequestsIn: p.friendRequestsIn ?? [],
        friendRequestsOut: p.friendRequestsOut ?? [],
        lastSeenAt: p.lastSeenAt,
        isPlaying: p.isPlaying ?? false,
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
  return normalizeProfile(rowToProfile(res.profile));
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
    friendRequestsIn: profile.friendRequestsIn,
    friendRequestsOut: profile.friendRequestsOut,
    lastSeenAt: profile.lastSeenAt,
    isPlaying: profile.isPlaying,
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
  return normalizeProfile(u);
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

export async function sendFriendRequest(friendName: string): Promise<{ ok: boolean; error?: string }> {
  const u = await fetchCurrentUser();
  if (!u) return { ok: false, error: "Войди в аккаунт" };
  const name = friendName.trim();
  const key = name.toLowerCase();
  if (name.length < 2) return { ok: false, error: "Ник слишком короткий" };
  if (key === u.username.toLowerCase()) return { ok: false, error: "Это ты" };
  if (hasFriend(u, name)) return { ok: false, error: "Уже в друзьях" };
  if (u.friendRequestsOut.some(r => r.username.toLowerCase() === key)) {
    return { ok: false, error: "Заявка уже отправлена" };
  }

  if (isCloudEnabled) {
    const session = getSession();
    if (!session) return { ok: false, error: "Нет сессии" };
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: "Сервер недоступен" };
    const { data, error } = await sb.rpc("send_friend_request", {
      p_username: session.username,
      p_password_hash: session.passwordHash,
      p_target: name,
    });
    if (error) return { ok: false, error: error.message };
    const res = data as { ok: boolean; error?: string };
    if (!res.ok) return { ok: false, error: res.error ?? "Ошибка" };
    await syncFriendRequestsFromCloud(session);
    return { ok: true };
  }

  const users = loadUsers();
  const target = users[key];
  if (!target) return { ok: false, error: "Нет такого игрока — он должен зарегистрироваться" };
  if (hasFriend(target, u.username)) return { ok: false, error: "Уже в друзьях" };
  const at = new Date().toISOString();
  const me = normalizeProfile(users[u.username] ?? u);
  me.friendRequestsOut = [...me.friendRequestsOut.filter(r => r.username.toLowerCase() !== key), { username: name, at }];
  target.friendRequestsIn = [...(target.friendRequestsIn ?? []).filter(r => r.username.toLowerCase() !== u.username), { username: u.username, at }];
  users[u.username] = me;
  users[key] = normalizeProfile(target);
  saveUsers(users);
  return { ok: true };
}

async function syncFriendRequestsFromCloud(session: Session): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { data } = await sb.rpc("get_friend_requests", {
    p_username: session.username,
    p_password_hash: session.passwordHash,
  });
  const res = data as { ok?: boolean; incoming?: FriendRequestEntry[]; outgoing?: FriendRequestEntry[] };
  if (!res?.ok) return;
  const u = await fetchCurrentUser();
  if (!u) return;
  u.friendRequestsIn = (res.incoming ?? []).map(r => ({
    username: r.username,
    at: r.at ?? new Date().toISOString(),
  }));
  u.friendRequestsOut = (res.outgoing ?? []).map(r => ({
    username: r.username,
    at: r.at ?? new Date().toISOString(),
  }));
  await saveUserProfile(u);
}

export async function acceptFriendRequest(fromName: string): Promise<{ ok: boolean; error?: string }> {
  const u = await fetchCurrentUser();
  if (!u) return { ok: false, error: "Войди в аккаунт" };
  const from = fromName.trim().toLowerCase();
  if (!u.friendRequestsIn.some(r => r.username.toLowerCase() === from)) {
    return { ok: false, error: "Нет заявки" };
  }
  if (u.friends.length >= 20) return { ok: false, error: "Макс 20 друзей" };

  if (isCloudEnabled) {
    const session = getSession();
    if (!session) return { ok: false, error: "Нет сессии" };
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: "Сервер недоступен" };
    const { data, error } = await sb.rpc("respond_friend_request", {
      p_username: session.username,
      p_password_hash: session.passwordHash,
      p_from: fromName,
      p_accept: true,
    });
    if (error) return { ok: false, error: error.message };
    const res = data as { ok: boolean; error?: string };
    if (!res.ok) return { ok: false, error: res.error ?? "Ошибка" };
    const fresh = await cloudFetchProfile(session);
    if (fresh) await saveUserProfile(fresh);
    await syncFriendRequestsFromCloud(session);
    return { ok: true };
  }

  const users = loadUsers();
  const me = normalizeProfile(users[u.username] ?? u);
  const other = users[from];
  if (!other) return { ok: false, error: "Игрок не найден" };
  const at = new Date().toISOString();
  me.friendRequestsIn = me.friendRequestsIn.filter(r => r.username.toLowerCase() !== from);
  me.friendRequestsOut = me.friendRequestsOut.filter(r => r.username.toLowerCase() !== from);
  other.friendRequestsOut = (other.friendRequestsOut ?? []).filter(r => r.username.toLowerCase() !== u.username);
  other.friendRequestsIn = (other.friendRequestsIn ?? []).filter(r => r.username.toLowerCase() !== u.username);
  if (!hasFriend(me, fromName)) {
    me.friends.push({ username: other.username, addedAt: at });
  }
  if (!hasFriend(other, u.username)) {
    other.friends.push({ username: me.username, addedAt: at });
  }
  users[u.username] = me;
  users[from] = normalizeProfile(other);
  saveUsers(users);
  return { ok: true };
}

export async function declineFriendRequest(fromName: string): Promise<{ ok: boolean; error?: string }> {
  const u = await fetchCurrentUser();
  if (!u) return { ok: false, error: "Войди в аккаунт" };
  const from = fromName.trim().toLowerCase();

  if (isCloudEnabled) {
    const session = getSession();
    if (!session) return { ok: false, error: "Нет сессии" };
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: "Сервер недоступен" };
    const { data, error } = await sb.rpc("respond_friend_request", {
      p_username: session.username,
      p_password_hash: session.passwordHash,
      p_from: fromName,
      p_accept: false,
    });
    if (error) return { ok: false, error: error.message };
    await syncFriendRequestsFromCloud(session);
    return { ok: true };
  }

  const users = loadUsers();
  const me = normalizeProfile(users[u.username] ?? u);
  me.friendRequestsIn = me.friendRequestsIn.filter(r => r.username.toLowerCase() !== from);
  users[u.username] = me;
  saveUsers(users);
  return { ok: true };
}

export async function cancelFriendRequest(targetName: string): Promise<void> {
  const u = await fetchCurrentUser();
  if (!u) return;
  const key = targetName.trim().toLowerCase();

  if (isCloudEnabled) {
    const session = getSession();
    if (!session) return;
    const sb = await getSupabase();
    if (sb) {
      await sb.rpc("cancel_friend_request", {
        p_username: session.username,
        p_password_hash: session.passwordHash,
        p_target: targetName,
      });
      await syncFriendRequestsFromCloud(session);
    }
    return;
  }

  const users = loadUsers();
  const me = normalizeProfile(users[u.username] ?? u);
  me.friendRequestsOut = me.friendRequestsOut.filter(r => r.username.toLowerCase() !== key);
  const target = users[key];
  if (target) {
    target.friendRequestsIn = (target.friendRequestsIn ?? []).filter(r => r.username.toLowerCase() !== u.username);
    users[key] = normalizeProfile(target);
  }
  users[u.username] = me;
  saveUsers(users);
}

export async function refreshFriendRequests(): Promise<void> {
  const session = getSession();
  if (!session || !isCloudEnabled) return;
  await syncFriendRequestsFromCloud(session);
}

export async function getFriendsStatus(): Promise<FriendPublicStatus[]> {
  const u = await fetchCurrentUser();
  if (!u || u.friends.length === 0) return [];

  const names = u.friends.map(f => f.username);

  if (isCloudEnabled) {
    const sb = await getSupabase();
    if (sb) {
      const { data, error } = await sb.rpc("get_users_status", { p_usernames: names });
      if (!error && Array.isArray(data)) {
        return (data as FriendPublicStatus[]).map(s => ({
          username: s.username,
          bestScore: Number(s.bestScore ?? 0),
          lastSeenAt: s.lastSeenAt ?? null,
          isPlaying: Boolean(s.isPlaying),
        }));
      }
    }
  }

  const users = loadUsers();
  const now = Date.now();
  return names.map(name => {
    const p = users[name.toLowerCase()];
    const last = p?.lastSeenAt ? Date.parse(p.lastSeenAt) : 0;
    const online = Boolean(p?.isPlaying) && now - last < 120_000;
    return {
      username: name,
      bestScore: p?.bestScore ?? 0,
      lastSeenAt: p?.lastSeenAt ?? null,
      isPlaying: online,
    };
  });
}

export async function setPresence(isPlaying: boolean): Promise<void> {
  const u = await fetchCurrentUser();
  if (!u) return;
  const session = getSession();
  if (!session) return;

  u.lastSeenAt = new Date().toISOString();
  u.isPlaying = isPlaying;

  if (isCloudEnabled) {
    const sb = await getSupabase();
    if (sb) {
      await sb.rpc("set_presence", {
        p_username: session.username,
        p_password_hash: session.passwordHash,
        p_is_playing: isPlaying,
      });
    }
    await saveUserProfile(u);
    return;
  }

  const users = loadUsers();
  users[u.username] = normalizeProfile({ ...u, lastSeenAt: u.lastSeenAt, isPlaying });
  saveUsers(users);
}

export async function removeFriend(friendName: string): Promise<void> {
  const u = await fetchCurrentUser();
  if (!u) return;
  const key = friendName.toLowerCase();
  u.friends = u.friends.filter(f => f.username.toLowerCase() !== key);
  await saveUserProfile(u);

  if (!isCloudEnabled) {
    const users = loadUsers();
    const other = users[key];
    if (other) {
      other.friends = other.friends.filter(f => f.username.toLowerCase() !== u.username.toLowerCase());
      users[key] = normalizeProfile(other);
      saveUsers(users);
    }
  }
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
  u.lastSeenAt = new Date().toISOString();
  u.isPlaying = false;
  await saveUserProfile(u);
  if (isCloudEnabled) {
    const sb = await getSupabase();
    if (sb && session) {
      await sb.rpc("set_presence", {
        p_username: session.username,
        p_password_hash: session.passwordHash,
        p_is_playing: false,
      });
    }
  }
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

/** Текст статуса друга для меню */
export function formatFriendActivity(s: FriendPublicStatus): string {
  if (s.isPlaying) return "В игре";
  if (!s.lastSeenAt) return "Давно не заходил";
  const ms = Date.now() - Date.parse(s.lastSeenAt);
  if (Number.isNaN(ms) || ms < 0) return "Недавно";
  const min = Math.floor(ms / 60_000);
  if (min < 2) return "Был только что";
  if (min < 60) return `Был ${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Был ${h} ч назад`;
  const d = Math.floor(h / 24);
  return `Был ${d} дн назад`;
}
