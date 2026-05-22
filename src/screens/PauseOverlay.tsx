import type { GameStats } from "../types";

interface PauseOverlayProps {
  stats: GameStats;
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseOverlay({ stats, onResume, onQuit }: PauseOverlayProps) {
  return (
    <div className="pause-overlay">
      <div className="pause-panel">
        <h2>ПАУЗА</h2>
        <div className="pause-stats">
          <span>Очки: <b>{stats.score}</b></span>
          <span>Волна: <b>{stats.wave}</b></span>
          <span>Убито: <b>{stats.enemiesKilled}</b></span>
          <span>Боссов: <b>{stats.bossesKilled}</b></span>
        </div>
        <p className="menu-hint" style={{ marginBottom: 12 }}>Лут на карте подбирается сразу (HP, щит, вода…)</p>
        <div className="pause-btns">
          <button className="pause-resume" type="button" onClick={onResume}>Продолжить</button>
          <button className="pause-quit" type="button" onClick={onQuit}>В меню</button>
        </div>
      </div>
    </div>
  );
}
