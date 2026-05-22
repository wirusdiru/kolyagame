import type { GameStats, InventorySlot } from "../types";

interface PauseOverlayProps {
  stats: GameStats;
  inventory: InventorySlot[];
  onResume: () => void;
  onQuit: () => void;
}

const ITEM_LABELS: Record<string, string> = {
  water_can: "Вода +30Л", pizza: "Пицца +30HP", antenna: "+50 очков", coin: "+25 очков",
  bone_bag: "+15 HP", kalyan_boost: "+80 очков", alien_cell: "+40 очков",
  stink_bomb: "+30 очков", shield: "Щит 2с",
};

export default function PauseOverlay({ stats, inventory, onResume, onQuit }: PauseOverlayProps) {
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
        <div className="pause-inv">
          <h4>Инвентарь (1-4)</h4>
          <div className="inv-slots">
            {inventory.map((slot, i) => (
              <div key={i} className={`inv-slot ${slot.count > 0 ? "filled" : ""}`}>
                <span className="inv-key">{i + 1}</span>
                {slot.count > 0 ? (
                  <>
                    <span className="inv-name">{ITEM_LABELS[slot.type] ?? slot.type}</span>
                    <span className="inv-count">×{slot.count}</span>
                  </>
                ) : (
                  <span className="inv-empty">пусто</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="pause-btns">
          <button className="pause-resume" onClick={onResume}>Продолжить</button>
          <button className="pause-quit" onClick={onQuit}>В меню</button>
        </div>
      </div>
    </div>
  );
}
