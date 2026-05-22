import type { PeerState } from "../onlineRoom";

const DIR = ["В", "СВ", "ЮВ", "Ю", "ЮЗ", "З", "СЗ", "С"] as const;

function dirWord(dx: number, dy: number): string {
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const i = Math.round(deg / 45) % 8;
  return DIR[i];
}

interface PeerCompassProps {
  peers: PeerState[];
  kx: number;
  ky: number;
  tick: number;
  screenW: number;
  screenH: number;
}

export default function PeerCompass({ peers, kx, ky, tick, screenW, screenH }: PeerCompassProps) {
  if (peers.length === 0) {
    return (
      <div className="peer-compass peer-compass--empty">
        <span>Кооп: друг не в эфире</span>
        <span className="peer-hint">Хост и гость в одной группе?</span>
      </div>
    );
  }

  return (
    <div className="peer-compass">
      {peers.map(p => {
        const dx = p.x - kx;
        const dy = p.y - ky;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const stale = tick - p.tick > 90;
        const angle = Math.atan2(dy, dx);
        const margin = 56;
        const cx = screenW / 2;
        const cy = screenH / 2;
        const rx = screenW / 2 - margin;
        const ry = screenH / 2 - margin;
        const ex = cx + Math.cos(angle) * rx;
        const ey = cy + Math.sin(angle) * ry;
        const near = dist < 100;

        return (
          <div key={p.username}>
            <div
              className={`peer-arrow ${stale ? "stale" : ""} ${near ? "near" : ""}`}
              style={{
                left: ex,
                top: ey,
                transform: `translate(-50%,-50%) rotate(${angle + Math.PI / 2}rad)`,
              }}
              title={`${p.username}: ${Math.round(dist)}px`}
            />
            <div
              className="peer-tag"
              style={{
                left: Math.min(screenW - 120, Math.max(8, ex + 14)),
                top: Math.min(screenH - 40, Math.max(8, ey - 8)),
              }}
            >
              <b>{p.username}</b>
              <span>
                {stale ? "нет сигнала" : near ? "рядом" : `${Math.round(dist)} · ${dirWord(dx, dy)}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
