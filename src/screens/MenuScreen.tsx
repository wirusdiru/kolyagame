import { useState } from "react";
import type { LeaderboardEntry, ShopUpgradeId, UserProfile } from "../types";
import { SHOP_ITEMS } from "../constants";
import * as storage from "../storage";

type Tab = "play" | "leaderboard" | "shop" | "auth";

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
    const level = user.upgrades[id];
    if (level >= item.maxLevel) return;
    const cost = item.baseCost + level * 40;
    setLoading(true);
    const ok = await storage.buyUpgrade(id, cost);
    setLoading(false);
    if (ok) onAuthChange();
  };

  const tabStyle = (t: Tab) => ({
    padding: "8px 16px",
    background: tab === t ? "rgba(255,107,53,0.3)" : "transparent",
    border: tab === t ? "2px solid #ff6b35" : "2px solid transparent",
    borderRadius: 8,
    color: tab === t ? "#ff6b35" : "#888",
    cursor: "pointer",
    fontWeight: tab === t ? "bold" as const : "normal" as const,
    fontSize: 13,
  });

  return (
    <div className="menu-root">
      <div className="menu-panel">
        <div className="menu-title-block">
          <h1 className="menu-title">КОЛЯ</h1>
          <p className="menu-subtitle">И ГОВНО ИНТЕРНЕТ</p>
          <p className="menu-tagline">
            {serverOnline ? "Онлайн: общий топ и аккаунты" : "Офлайн: данные только в этом браузере"}
          </p>
        </div>

        {user && (
          <div className="menu-user">
            Игрок: <b>{user.username}</b> · Монеты: <b>{user.totalCoins}</b> · Рекорд: <b>{user.bestScore}</b>
          </div>
        )}

        <div className="menu-tabs">
          {(["play", "leaderboard", "shop", "auth"] as Tab[]).map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => { setTab(t); if (t === "leaderboard") loadLb(); }}>
              {t === "play" ? "Игра" : t === "leaderboard" ? "Топ" : t === "shop" ? "Магазин" : "Вход"}
            </button>
          ))}
        </div>

        {tab === "play" && (
          <div className="menu-play">
            <button className="menu-play-btn" onClick={onStart} disabled={loading}>
              ИГРАТЬ ЗА КОЛЮ
            </button>
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
            <button className="shop-buy-btn" style={{ marginTop: 10, width: "100%" }} onClick={loadLb}>
              Обновить
            </button>
          </div>
        )}

        {tab === "shop" && (
          <div className="menu-shop">
            {!user ? (
              <p className="menu-empty">Войди в аккаунт</p>
            ) : (
              SHOP_ITEMS.map(item => {
                const lvl = user.upgrades[item.id];
                const cost = item.baseCost + lvl * 40;
                const maxed = lvl >= item.maxLevel;
                return (
                  <div key={item.id} className="shop-item">
                    <div>
                      <b>{item.name}</b> <span className="shop-lvl">Lv.{lvl}/{item.maxLevel}</span>
                      <p>{item.desc}</p>
                    </div>
                    <button
                      disabled={maxed || user.totalCoins < cost || loading}
                      onClick={() => buyUpgrade(item.id)}
                      className="shop-buy-btn"
                    >
                      {maxed ? "MAX" : `${cost} монет`}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "auth" && (
          <div className="menu-auth">
            <div className="auth-toggle">
              <button type="button" style={tabStyle(authMode === "login" ? "play" : "leaderboard")} onClick={() => setAuthMode("login")}>Вход</button>
              <button type="button" style={tabStyle(authMode === "register" ? "play" : "leaderboard")} onClick={() => setAuthMode("register")}>Регистрация</button>
            </div>
            <input
              className="auth-input"
              placeholder="Имя игрока"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
            />
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
