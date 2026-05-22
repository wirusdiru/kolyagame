import { useState } from "react";
import type { AbilityId, KolyaSkinId, LeaderboardEntry, SabSkinId, ShopUpgradeId, UserProfile } from "../types";
import {
  SHOP_ITEMS, ABILITY_SHOP, KOLYA_SKINS, SAB_SKINS,
} from "../constants";
import * as storage from "../storage";
import { createRoomCode, joinCoopChannel } from "../coop";

type Tab = "play" | "leaderboard" | "shop" | "skins" | "friends" | "auth";

interface MenuScreenProps {
  onStart: () => void;
  user: UserProfile | null;
  serverOnline: boolean;
  onAuthChange: () => void;
}

export default function MenuScreen({ onStart, user, serverOnline, onAuthChange }: MenuScreenProps) {
  const [tab, setTab] = useState<Tab>("play");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [shopSection, setShopSection] = useState<"upgrades" | "abilities">("upgrades");
  const [friendInput, setFriendInput] = useState("");
  const [friendMsg, setFriendMsg] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [coopMsg, setCoopMsg] = useState("");

  const loadLb = async () => {
    setLoading(true);
    setLeaderboard(await storage.getLeaderboard());
    setLoading(false);
  };

  const handleAuth = async () => {
    setAuthError("");
    setLoading(true);
    const res = authMode === "login"
      ? await storage.login(username, password)
      : await storage.register(username, password);
    setLoading(false);
    if (!res.ok) { setAuthError(res.error ?? "Ошибка"); return; }
    setPassword("");
    onAuthChange();
    setTab("play");
  };

  const buyUpgrade = async (id: ShopUpgradeId) => {
    const item = SHOP_ITEMS.find(s => s.id === id);
    if (!item || !user) return;
    const level = user.upgrades[id] ?? 0;
    if (level >= item.maxLevel) return;
    const cost = item.baseCost + level * 40;
    setLoading(true);
    const ok = await storage.buyUpgrade(id, cost);
    setLoading(false);
    if (ok) onAuthChange();
  };

  const buyAbility = async (id: AbilityId) => {
    const item = ABILITY_SHOP.find(a => a.id === id);
    if (!item || !user || user.abilities[id]) return;
    setLoading(true);
    const ok = await storage.buyAbility(id, item.cost);
    setLoading(false);
    if (ok) onAuthChange();
  };

  const buyKolyaSkin = async (id: KolyaSkinId, cost: number) => {
    setLoading(true);
    const ok = await storage.buyKolyaSkin(id, cost);
    setLoading(false);
    if (ok) onAuthChange();
  };

  const buySabSkin = async (id: SabSkinId, cost: number) => {
    setLoading(true);
    const ok = await storage.buySabSkin(id, cost);
    setLoading(false);
    if (ok) onAuthChange();
  };

  const addFriend = async () => {
    setFriendMsg("");
    setLoading(true);
    const res = await storage.addFriend(friendInput);
    setLoading(false);
    if (res.ok) { setFriendInput(""); onAuthChange(); setFriendMsg("Добавлен!"); }
    else setFriendMsg(res.error ?? "Ошибка");
  };

  const createCoopRoom = () => {
    const code = createRoomCode();
    setRoomCode(code);
    setCoopMsg(`Комната ${code} — отправь другу. ${serverOnline ? "Онлайн через Supabase." : "Локально: друг вводит код в своём браузере."}`);
  };

  const joinCoopRoom = async () => {
    if (!roomCode || !user) return;
    const ch = await joinCoopChannel(roomCode, user.username, () => {});
    if (ch) setCoopMsg("Подключено! Запусти игру — друг увидит тебя (бета).");
    else setCoopMsg("Кооп: войди в аккаунт и настрой Supabase, или играй соло.");
  };

  const tabStyle = (t: Tab) => ({
    padding: "6px 10px",
    background: tab === t ? "rgba(255,107,53,0.3)" : "transparent",
    border: tab === t ? "2px solid #ff6b35" : "2px solid transparent",
    borderRadius: 8,
    color: tab === t ? "#ff6b35" : "#888",
    cursor: "pointer",
    fontWeight: tab === t ? "bold" as const : "normal" as const,
    fontSize: 11,
  });

  const tabLabels: Record<Tab, string> = {
    play: "Игра", leaderboard: "Топ", shop: "Магазин",
    skins: "Скины", friends: "Друзья", auth: "Вход",
  };

  return (
    <div className="menu-root">
      <div className="menu-panel menu-panel-wide">
        <div className="menu-title-block">
          <h1 className="menu-title">КОЛЯ</h1>
          <p className="menu-subtitle">И ГОВНО ИНТЕРНЕТ</p>
          <p className="menu-tagline">
            {serverOnline ? "Онлайн: топ, друзья, кооп (бета)" : "Офлайн: данные в браузере"}
          </p>
        </div>

        {user && (
          <div className="menu-user">
            Игрок: <b>{user.username}</b> · Монеты: <b>{user.totalCoins}</b> · Рекорд: <b>{user.bestScore}</b>
          </div>
        )}

        <div className="menu-tabs menu-tabs-wrap">
          {(["play", "leaderboard", "shop", "skins", "friends", "auth"] as Tab[]).map(t => (
            <button key={t} type="button" style={tabStyle(t)} onClick={() => { setTab(t); if (t === "leaderboard") loadLb(); }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === "play" && (
          <div className="menu-play">
            <button type="button" className="menu-play-btn" onClick={onStart} disabled={loading}>
              ИГРАТЬ ЗА КОЛЮ
            </button>
            <p className="menu-hint">Бесконечный мир · биомы · только вода (F)</p>
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="menu-lb">
            <h3>Таблица лидеров {serverOnline ? "(все игроки)" : ""}</h3>
            {loading ? <p className="menu-empty">Загрузка...</p> : leaderboard.length === 0 ? (
              <p className="menu-empty">Пока пусто</p>
            ) : (
              <table>
                <thead>
                  <tr><th>#</th><th>Игрок</th><th>Очки</th><th>Волна</th></tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 20).map((e, i) => (
                    <tr key={`${e.username}-${e.date}-${i}`} className={i < 3 ? "top-row" : ""}>
                      <td>{i + 1}</td>
                      <td>{e.username}</td>
                      <td>{e.score}</td>
                      <td>{e.wave}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button type="button" className="shop-buy-btn" style={{ marginTop: 10, width: "100%" }} onClick={loadLb}>
              Обновить
            </button>
          </div>
        )}

        {tab === "shop" && (
          <div className="menu-shop">
            {!user ? (
              <p className="menu-empty">Войди в аккаунт</p>
            ) : (
              <>
                <div className="shop-section-tabs">
                  <button type="button" className={shopSection === "upgrades" ? "active" : ""} onClick={() => setShopSection("upgrades")}>Прокачка</button>
                  <button type="button" className={shopSection === "abilities" ? "active" : ""} onClick={() => setShopSection("abilities")}>Способности</button>
                </div>
                {shopSection === "upgrades" && SHOP_ITEMS.map(item => {
                  const lvl = user.upgrades[item.id] ?? 0;
                  const cost = item.baseCost + lvl * 40;
                  const maxed = lvl >= item.maxLevel;
                  return (
                    <div key={item.id} className="shop-item">
                      <div>
                        <b>{item.name}</b> <span className="shop-lvl">Lv.{lvl}/{item.maxLevel}</span>
                        <p>{item.desc}</p>
                      </div>
                      <button type="button" disabled={maxed || user.totalCoins < cost || loading} onClick={() => buyUpgrade(item.id)} className="shop-buy-btn">
                        {maxed ? "MAX" : `${cost} монет`}
                      </button>
                    </div>
                  );
                })}
                {shopSection === "abilities" && ABILITY_SHOP.map(item => {
                  const owned = user.abilities[item.id];
                  return (
                    <div key={item.id} className="shop-item">
                      <div>
                        <b>{item.name}</b> {owned && <span className="shop-owned">✓</span>}
                        <p>{item.desc}</p>
                      </div>
                      <button type="button" disabled={owned || user.totalCoins < item.cost || loading} onClick={() => buyAbility(item.id)} className="shop-buy-btn">
                        {owned ? "КУПЛЕНО" : `${item.cost} монет`}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === "skins" && (
          <div className="menu-shop">
            {!user ? <p className="menu-empty">Войди в аккаунт</p> : (
              <>
                <h4 className="skin-heading">Скины Коли</h4>
                {KOLYA_SKINS.map(sk => {
                  const owned = user.ownedKolyaSkins.includes(sk.id);
                  const equipped = user.equippedKolyaSkin === sk.id;
                  return (
                    <div key={sk.id} className={`shop-item ${sk.premium ? "premium-skin" : ""}`}>
                      <div>
                        <b>{sk.name}</b> {sk.premium && <span className="premium-badge">★</span>}
                        <p>{sk.desc}</p>
                      </div>
                      <div className="skin-actions">
                        {owned ? (
                          <button type="button" className="shop-buy-btn" disabled={equipped || loading} onClick={() => storage.equipKolyaSkin(sk.id).then(onAuthChange)}>
                            {equipped ? "НАДЕТ" : "Надеть"}
                          </button>
                        ) : (
                          <button type="button" className="shop-buy-btn" disabled={user.totalCoins < sk.cost || loading} onClick={() => buyKolyaSkin(sk.id, sk.cost)}>
                            {sk.cost} монет
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <h4 className="skin-heading">Скины Собака Семечкин</h4>
                {SAB_SKINS.map(sk => {
                  const owned = user.ownedSabSkins.includes(sk.id);
                  const equipped = user.equippedSabSkin === sk.id;
                  return (
                    <div key={sk.id} className="shop-item">
                      <div>
                        <b>{sk.name}</b>
                        <p>{sk.desc}</p>
                      </div>
                      <div className="skin-actions">
                        {owned ? (
                          <button type="button" className="shop-buy-btn" disabled={equipped || loading} onClick={() => storage.equipSabSkin(sk.id).then(onAuthChange)}>
                            {equipped ? "НАДЕТ" : "Надеть"}
                          </button>
                        ) : (
                          <button type="button" className="shop-buy-btn" disabled={user.totalCoins < sk.cost || loading} onClick={() => buySabSkin(sk.id, sk.cost)}>
                            {sk.cost} монет
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === "friends" && (
          <div className="menu-friends">
            {!user ? <p className="menu-empty">Войди в аккаунт</p> : (
              <>
                <div className="friend-add">
                  <input className="auth-input" placeholder="Ник друга" value={friendInput} onChange={e => setFriendInput(e.target.value)} />
                  <button type="button" className="shop-buy-btn" onClick={addFriend} disabled={loading}>Добавить</button>
                </div>
                {friendMsg && <p className="friend-msg">{friendMsg}</p>}
                <ul className="friend-list">
                  {user.friends.length === 0 ? <li className="menu-empty">Пока никого</li> : user.friends.map(f => (
                    <li key={f.username}>
                      {f.username}
                      <button type="button" className="friend-remove" onClick={() => storage.removeFriend(f.username).then(onAuthChange)}>×</button>
                    </li>
                  ))}
                </ul>
                <div className="coop-box">
                  <h4>Игра с другом (бета)</h4>
                  <button type="button" className="shop-buy-btn" onClick={createCoopRoom}>Создать комнату</button>
                  <input className="auth-input" placeholder="Код комнаты" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
                  <button type="button" className="shop-buy-btn" onClick={joinCoopRoom}>Войти в комнату</button>
                  {coopMsg && <p className="coop-msg">{coopMsg}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "auth" && (
          <div className="menu-auth">
            <div className="auth-toggle">
              <button type="button" style={tabStyle(authMode === "login" ? "play" : "leaderboard")} onClick={() => setAuthMode("login")}>Вход</button>
              <button type="button" style={tabStyle(authMode === "register" ? "play" : "leaderboard")} onClick={() => setAuthMode("register")}>Регистрация</button>
            </div>
            <input className="auth-input" placeholder="Имя игрока" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
            <input className="auth-input" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} />
            {authError && <p className="auth-error">{authError}</p>}
            <button type="button" className="menu-play-btn" onClick={handleAuth} disabled={loading}>
              {loading ? "..." : authMode === "login" ? "ВОЙТИ" : "СОЗДАТЬ АККАУНТ"}
            </button>
            {user && (
              <button type="button" className="auth-logout" onClick={() => { storage.logout(); onAuthChange(); }}>
                Выйти ({user.username})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
