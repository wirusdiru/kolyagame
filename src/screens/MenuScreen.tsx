import { useState, useEffect } from "react";
import type { AbilityId, KolyaSkinId, LeaderboardEntry, SabSkinId, ShopUpgradeId, UserProfile } from "../types";
import {
  SHOP_ITEMS, ABILITY_SHOP, KOLYA_SKINS, SAB_SKINS, SHOP_LEVEL_STEP,
} from "../constants";
import * as storage from "../storage";
import { isCloudEnabled } from "../supabaseClient";

type Tab = "play" | "leaderboard" | "shop" | "skins" | "friends" | "auth";

interface MenuScreenProps {
  onStartSolo: () => void;
  user: UserProfile | null;
  serverOnline: boolean;
  onAuthChange: () => void;
}

export default function MenuScreen({ onStartSolo, user, serverOnline, onAuthChange }: MenuScreenProps) {
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
    const cost = item.baseCost + level * SHOP_LEVEL_STEP;
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
            {serverOnline ? "Онлайн: топ, друзья, аккаунт" : "Офлайн: данные в браузере"}
          </p>
          {user && (
            <p className="menu-user-line">
              Игрок: <b>{user.username}</b> · Монеты: <b>{user.totalCoins}</b> · Рекорд: <b>{user.bestScore}</b>
            </p>
          )}
        </div>

        <div className="menu-tabs">
          {(Object.keys(tabLabels) as Tab[]).map(t => (
            <button key={t} type="button" style={tabStyle(t)} onClick={() => { setTab(t); if (t === "leaderboard") void loadLb(); }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === "play" && (
          <div className="menu-play">
            <button type="button" className="menu-play-btn" onClick={onStartSolo} disabled={loading}>
              ИГРАТЬ ЗА КОЛЮ
            </button>
            <p className="menu-hint">Бесконечный мир · биомы · вода (F при ≤2Л) · E гипноз · Q вонь</p>
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
            <button type="button" className="auth-logout" style={{ marginTop: 12 }} onClick={() => void loadLb()}>Обновить</button>
          </div>
        )}

        {tab === "shop" && user && (
          <div className="menu-shop">
            {user.totalCoins < 300 && (
              <p className="menu-hint">Монеты за забег — прокачка теперь дороже, играй больше раундов</p>
            )}
            <>
              <div className="shop-section-tabs">
                <button type="button" className={shopSection === "upgrades" ? "active" : ""} onClick={() => setShopSection("upgrades")}>Прокачка</button>
                <button type="button" className={shopSection === "abilities" ? "active" : ""} onClick={() => setShopSection("abilities")}>Способности</button>
              </div>
              {shopSection === "upgrades" && SHOP_ITEMS.map(item => {
                const lvl = user.upgrades[item.id] ?? 0;
                const cost = item.baseCost + lvl * SHOP_LEVEL_STEP;
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
                      <b>{item.name}</b>
                      <p>{item.desc}</p>
                    </div>
                    <button type="button" disabled={owned || user.totalCoins < item.cost || loading} onClick={() => buyAbility(item.id)} className="shop-buy-btn">
                      {owned ? "КУПЛЕНО" : `${item.cost} монет`}
                    </button>
                  </div>
                );
              })}
            </>
          </div>
        )}
        {tab === "shop" && !user && <p className="menu-empty">Войди в аккаунт для магазина</p>}

        {tab === "skins" && user && (
          <div className="menu-shop">
            <h4>Скины Коли</h4>
            {KOLYA_SKINS.map(sk => {
              const owned = user.ownedKolyaSkins.includes(sk.id);
              const equipped = user.equippedKolyaSkin === sk.id;
              return (
                <div key={sk.id} className="shop-item">
                  <div>
                    <b>{sk.name}</b> {equipped && <span className="shop-lvl">надет</span>}
                    <p>{sk.desc}</p>
                  </div>
                  {owned ? (
                    <button type="button" className="shop-buy-btn" disabled={equipped || loading} onClick={async () => { await storage.equipKolyaSkin(sk.id); onAuthChange(); }}>
                      {equipped ? "НАДЕТ" : "Надеть"}
                    </button>
                  ) : (
                    <button type="button" className="shop-buy-btn" disabled={user.totalCoins < sk.cost || loading} onClick={() => buyKolyaSkin(sk.id, sk.cost)}>
                      {sk.cost} монет
                    </button>
                  )}
                </div>
              );
            })}
            <h4 style={{ marginTop: 16 }}>Скины Семечкина</h4>
            {SAB_SKINS.map(sk => {
              const owned = user.ownedSabSkins.includes(sk.id);
              const equipped = user.equippedSabSkin === sk.id;
              return (
                <div key={sk.id} className="shop-item">
                  <div>
                    <b>{sk.name}</b> {equipped && <span className="shop-lvl">надет</span>}
                    <p>{sk.desc}</p>
                  </div>
                  {owned ? (
                    <button type="button" className="shop-buy-btn" disabled={equipped || loading} onClick={async () => { await storage.equipSabSkin(sk.id); onAuthChange(); }}>
                      {equipped ? "НАДЕТ" : "Надеть"}
                    </button>
                  ) : (
                    <button type="button" className="shop-buy-btn" disabled={user.totalCoins < sk.cost || loading} onClick={() => buySabSkin(sk.id, sk.cost)}>
                      {sk.cost} монет
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === "skins" && !user && <p className="menu-empty">Войди в аккаунт</p>}

        {tab === "friends" && user && (
          <div className="menu-shop">
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input className="auth-input" placeholder="Ник друга" value={friendInput} onChange={e => setFriendInput(e.target.value)} />
              <button type="button" className="shop-buy-btn" onClick={addFriend} disabled={loading}>+</button>
            </div>
            {friendMsg && <p className="coop-msg">{friendMsg}</p>}
            {user.friends.length === 0 ? <p className="menu-empty">Нет друзей</p> : (
              <ul className="friends-list">
                {user.friends.map(f => (
                  <li key={f.username}>
                    {f.username}
                    <button type="button" className="auth-logout" onClick={async () => { await storage.removeFriend(f.username); onAuthChange(); }}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {tab === "friends" && !user && <p className="menu-empty">Войди в аккаунт</p>}

        {tab === "auth" && (
          <div className="menu-auth">
            <div className="auth-tabs">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Вход</button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Регистрация</button>
            </div>
            <input className="auth-input" placeholder="Имя игрока" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
            <input className="auth-input" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} />
            {authError && <p className="auth-error">{authError}</p>}
            <button type="button" className="menu-play-btn" onClick={handleAuth} disabled={loading}>
              {authMode === "login" ? "ВОЙТИ" : "СОЗДАТЬ АККАУНТ"}
            </button>
            {user && (
              <button type="button" className="auth-logout" onClick={async () => { await storage.logout(); onAuthChange(); }}>Выйти ({user.username})</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
