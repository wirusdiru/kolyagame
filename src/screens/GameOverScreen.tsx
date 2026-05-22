import type { GameStats } from "../types";

interface GameOverScreenProps {
  stats: GameStats;
  onRestart: () => void;
  onMenu: () => void;
}

export default function GameOverScreen({ stats, onRestart, onMenu }: GameOverScreenProps) {
  return (
    <div className="menu-root">
      <div className="menu-panel gameover-panel">
        <h1 className="gameover-title">КОЛЯ УПАЛ</h1>
        <p className="gameover-sub">Вялый Степ смотрит с дерева с удовлетворением</p>
        <div className="gameover-stats">
          {[
            ["Очки", stats.score],
            ["Волна", stats.wave],
            ["Убито врагов", stats.enemiesKilled],
            ["Боссов", stats.bossesKilled],
            ["Подтягиваний", stats.totalPullUps],
            ["Инопланетянин", stats.alienAbductions + " раз"],
            ["Монет заработано", stats.coinsEarned],
          ].map(([label, val], i) => (
            <div key={i} className="stat-row">
              <span>{label}</span>
              <span className="stat-val">{val}</span>
            </div>
          ))}
        </div>
        <div className="pause-btns">
          <button className="menu-play-btn" onClick={onRestart}>Воскреснуть Колей</button>
          <button className="pause-quit" onClick={onMenu}>В меню</button>
        </div>
      </div>
    </div>
  );
}
