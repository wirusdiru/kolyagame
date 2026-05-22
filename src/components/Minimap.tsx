import type { MutableRefObject } from "react";
import type { InfiniteWorld } from "../infiniteWorld";
import { TILE_SIZE } from "../infiniteWorld";
import type { WorldSnapshot } from "../worldRef";
import type { TileType } from "../types";

const MM = 168;
const VIEW_TILES = 14;

const TILE_MM: Record<TileType, string> = {
  grass: "#3d8a40", grass2: "#4fa855", tree: "#1e6b28", water: "#2a7ab8",
  path: "#9a8458", rock: "#6a6a72", wire: "#b86a20", bush: "#358a38",
  mud: "#5a4a30", snow: "#e8f4fc", sand: "#d4b060",
};

interface MinimapProps {
  worldRef: MutableRefObject<WorldSnapshot>;
  infiniteWorldRef: MutableRefObject<InfiniteWorld>;
}

export default function Minimap({ worldRef, infiniteWorldRef }: MinimapProps) {
  const w = worldRef.current;
  const iw = infiniteWorldRef.current;
  const cx = w.kx;
  const cy = w.ky;
  const tilePx = MM / VIEW_TILES;
  const tx0 = Math.floor(cx / TILE_SIZE) - Math.floor(VIEW_TILES / 2);
  const ty0 = Math.floor(cy / TILE_SIZE) - Math.floor(VIEW_TILES / 2);

  const tiles: { type: TileType; x: number; y: number }[] = [];
  for (let dy = 0; dy < VIEW_TILES; dy++) {
    for (let dx = 0; dx < VIEW_TILES; dx++) {
      const wtx = tx0 + dx;
      const wty = ty0 + dy;
      iw.generateChunk(Math.floor(wtx / 16), Math.floor(wty / 16));
      tiles.push({
        type: iw.getTile(wtx * TILE_SIZE, wty * TILE_SIZE),
        x: dx * tilePx,
        y: dy * tilePx,
      });
    }
  }

  const toMm = (wx: number, wy: number) => ({
    x: ((wx / TILE_SIZE) - tx0 + 0.5) * tilePx,
    y: ((wy / TILE_SIZE) - ty0 + 0.5) * tilePx,
  });

  const you = toMm(cx, cy);
  const sab = toMm(w.sabX, w.sabY);

  return (
    <div className="minimap-panel">
      <div className="minimap-title">КАРТА</div>
      <svg width={MM} height={MM} className="minimap-svg">
        <defs>
          <radialGradient id="mmBg">
            <stop offset="0%" stopColor="#1a3a28" />
            <stop offset="100%" stopColor="#0a1810" />
          </radialGradient>
        </defs>
        <rect width={MM} height={MM} fill="url(#mmBg)" rx={8} />
        {tiles.map((t, i) => (
          <rect
            key={i}
            x={t.x + 0.5}
            y={t.y + 0.5}
            width={tilePx - 1}
            height={tilePx - 1}
            fill={TILE_MM[t.type]}
            opacity={0.92}
          />
        ))}
        <rect
          x={MM / 2 - 12}
          y={MM / 2 - 12}
          width={24}
          height={24}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {w.enemies.slice(0, 40).map(en => {
          const p = toMm(en.x, en.y);
          if (p.x < 0 || p.y < 0 || p.x > MM || p.y > MM) return null;
          return <circle key={en.id} cx={p.x} cy={p.y} r={3} fill="#ff4466" />;
        })}
        {w.boss && (() => {
          const p = toMm(w.boss.x, w.boss.y);
          return <circle cx={p.x} cy={p.y} r={7} fill="#ff00ff" stroke="#fff" strokeWidth={1} />;
        })()}
        <circle cx={sab.x} cy={sab.y} r={5} fill="#ffaa22" stroke="#fff" strokeWidth={1} />
        {w.onlinePeers.map(p => {
          const pos = toMm(p.x, p.y);
          return (
            <g key={p.username}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={p.isDead ? 4 : 6}
                fill={p.isDead ? "#444" : "#44ccff"}
                stroke="#fff"
                strokeWidth={1.5}
              />
              {!p.isDead && (
                <polygon
                  points={`${pos.x},${pos.y - 12} ${pos.x - 5},${pos.y - 5} ${pos.x + 5},${pos.y - 5}`}
                  fill="#44ccff"
                />
              )}
            </g>
          );
        })}
        <circle cx={you.x} cy={you.y} r={7} fill="#ff6b35" stroke="#fff" strokeWidth={2} />
        <polygon
          points={`${you.x},${you.y - 14} ${you.x - 6},${you.y - 6} ${you.x + 6},${you.y - 6}`}
          fill="#ff6b35"
        />
      </svg>
      <div className="minimap-legend">
        <span><i className="dot orange" /> Коля</span>
        <span><i className="dot cyan" /> Друг</span>
        <span><i className="dot red" /> Враг</span>
      </div>
    </div>
  );
}
