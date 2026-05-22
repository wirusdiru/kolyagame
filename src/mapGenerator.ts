import type { MapTile, TileType } from "./types";

export const WORLD_W = 3000;
export const WORLD_H = 3000;
export const TILE_SIZE = 48;

export type TileGrid = TileType[][];

export interface MapData {
  tiles: MapTile[];
  grid: TileGrid;
  spawnX: number;
  spawnY: number;
  seed: number;
}

function seededRandom(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Слой шума 0..1 */
function noise(tx: number, ty: number, seed: number): number {
  const r = seededRandom(tx * 374761 + ty * 668265 + seed * 982451);
  return r();
}

function fbm(tx: number, ty: number, seed: number, scale: number): number {
  let v = 0;
  let amp = 1;
  let freq = scale;
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    v += noise(tx * freq, ty * freq, seed + i * 7919) * amp;
    sum += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v / sum;
}

function findSpawnPoint(grid: TileGrid, cols: number, rows: number): { x: number; y: number } {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const clearR = 7;

  for (let oy = -clearR; oy <= clearR; oy++) {
    for (let ox = -clearR; ox <= clearR; ox++) {
      const tx = cx + ox;
      const ty = cy + oy;
      if (tx < 1 || ty < 1 || tx >= cols - 1 || ty >= rows - 1) continue;
      grid[ty][tx] = ox * ox + oy * oy < clearR * clearR ? "path" : "grass";
    }
  }

  for (let r = 0; r < 20; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 3 || ty < 3 || tx >= cols - 3 || ty >= rows - 3) continue;
        const t = grid[ty][tx];
        if (t === "water" || t === "tree" || t === "rock") continue;
        let ok = true;
        for (let oy = -2; oy <= 2 && ok; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const nt = grid[ty + oy]?.[tx + ox];
            if (nt === "water" || nt === "tree" || nt === "rock") { ok = false; break; }
          }
        }
        if (ok) {
          return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
  }
  return { x: cx * TILE_SIZE + TILE_SIZE / 2, y: cy * TILE_SIZE + TILE_SIZE / 2 };
}

/**
 * Разнообразный мир: луга, леса, камни, тропинки, редкие озёра (~4–6% воды).
 * Каждый seed — другая карта.
 */
export function generateMap(seed?: number): MapData {
  const s = seed ?? Math.floor(Math.random() * 1_000_000_000);
  const cols = Math.ceil(WORLD_W / TILE_SIZE);
  const rows = Math.ceil(WORLD_H / TILE_SIZE);
  const grid: TileGrid = [];

  for (let ty = 0; ty < rows; ty++) {
    grid[ty] = [];
    for (let tx = 0; tx < cols; tx++) {
      const elev = fbm(tx, ty, s, 0.012);
      const moist = fbm(tx, ty, s + 111, 0.015);
      const detail = fbm(tx, ty, s + 222, 0.045);
      const paths = fbm(tx, ty, s + 333, 0.02);
      const lakes = fbm(tx, ty, s + 444, 0.008);
      const edge = Math.min(tx, ty, cols - 1 - tx, rows - 1 - ty);

      let type: TileType = "grass";

      if (edge === 0) {
        type = "rock";
      } else if (edge === 1) {
        type = "bush";
      } else if (lakes < 0.055) {
        type = "water";
      } else if (lakes < 0.075) {
        type = "mud";
      } else if (detail > 0.78 && elev > 0.55) {
        type = "wire";
      } else if (detail > 0.72 && elev > 0.62) {
        type = "rock";
      } else if (detail > 0.62 && moist > 0.48) {
        type = "tree";
      } else if (detail > 0.55 && moist > 0.42) {
        type = "bush";
      } else if (paths > 0.68 && detail < 0.5) {
        type = "path";
      } else if (elev > 0.58 && moist < 0.4) {
        type = "grass2";
      } else if (moist > 0.52) {
        type = "grass";
      }

      grid[ty][tx] = type;
    }
  }

  const spawn = findSpawnPoint(grid, cols, rows);
  const tiles: MapTile[] = [];
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      tiles.push({ type: grid[ty][tx], x: tx * TILE_SIZE, y: ty * TILE_SIZE });
    }
  }

  return { tiles, grid, spawnX: spawn.x, spawnY: spawn.y, seed: s };
}

export function isTileBlocking(type: TileType): boolean {
  return type === "tree" || type === "rock" || type === "water";
}

export function getTileSpeed(type: TileType): number {
  if (type === "mud") return 0.82;
  if (type === "bush") return 0.78;
  return 1;
}

export function getTileFromGrid(grid: TileGrid, wx: number, wy: number): TileType {
  const tx = Math.floor(wx / TILE_SIZE);
  const ty = Math.floor(wy / TILE_SIZE);
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return "rock";
  return grid[ty][tx];
}

export function isWalkable(grid: TileGrid, wx: number, wy: number): boolean {
  return !isTileBlocking(getTileFromGrid(grid, wx, wy));
}

export function findLandPosition(
  grid: TileGrid,
  nearX: number,
  nearY: number,
  minDist: number,
  maxDist: number,
  attempts = 50,
): { x: number; y: number } {
  for (let i = 0; i < attempts; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = minDist + Math.random() * (maxDist - minDist);
    const x = nearX + Math.cos(a) * d;
    const y = nearY + Math.sin(a) * d;
    if (x < 60 || x > WORLD_W - 60 || y < 60 || y > WORLD_H - 60) continue;
    if (isWalkable(grid, x, y) && isWalkable(grid, x + 24, y) && isWalkable(grid, x, y + 24)) {
      return { x, y };
    }
  }
  return { x: nearX, y: nearY };
}
