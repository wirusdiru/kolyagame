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
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noise2D(tx: number, ty: number, seed: number): number {
  const r = seededRandom(tx * 127 + ty * 311 + seed);
  const r2 = seededRandom(tx * 53 + ty * 97 + seed + 7);
  return r() * 0.6 + r2() * 0.4;
}

function findSpawnPoint(grid: TileGrid, cols: number, rows: number): { x: number; y: number } {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);

  for (let r = 0; r < 18; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 2 || ty < 2 || tx >= cols - 2 || ty >= rows - 2) continue;
        if (grid[ty][tx] !== "grass" && grid[ty][tx] !== "path") continue;
        let ok = true;
        for (let oy = -2; oy <= 2 && ok; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const t = grid[ty + oy]?.[tx + ox];
            if (t === "water" || t === "tree" || t === "rock") { ok = false; break; }
          }
        }
        if (ok) {
          for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
              if (grid[ty + oy]?.[tx + ox] !== "water") grid[ty + oy][tx + ox] = "grass";
            }
          }
          return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
  }
  return { x: WORLD_W / 2, y: WORLD_H / 2 };
}

/** Разнообразная карта: леса, озёра, тропинки, камни — не кольцо воды вокруг спавна */
export function generateMap(seed = 42): MapData {
  const cols = Math.ceil(WORLD_W / TILE_SIZE);
  const rows = Math.ceil(WORLD_H / TILE_SIZE);
  const grid: TileGrid = [];
  const tiles: MapTile[] = [];

  for (let ty = 0; ty < rows; ty++) {
    grid[ty] = [];
    for (let tx = 0; tx < cols; tx++) {
      const n = noise2D(tx * 0.09, ty * 0.09, seed);
      const n2 = noise2D(tx * 0.17, ty * 0.17, seed + 99);
      const n3 = noise2D(tx * 0.25, ty * 0.25, seed + 50);
      const edge = Math.min(tx, ty, cols - 1 - tx, rows - 1 - ty);

      let type: TileType = "grass";

      if (edge < 2) {
        type = "water";
      } else if (n < 0.2) {
        type = "water";
      } else if (n < 0.26) {
        type = "mud";
      } else if (n2 > 0.76 && n > 0.38) {
        type = "tree";
      } else if (n2 > 0.7 && n > 0.35) {
        type = "rock";
      } else if (n2 > 0.62) {
        type = "bush";
      } else if (n > 0.52 && n3 < 0.35) {
        type = "grass2";
      } else if (n3 > 0.82) {
        type = "wire";
      }

      if (n3 > 0.7 && n > 0.4 && type !== "water") type = "path";

      grid[ty][tx] = type;
      tiles.push({ type, x: tx * TILE_SIZE, y: ty * TILE_SIZE });
    }
  }

  const spawn = findSpawnPoint(grid, cols, rows);
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      tiles[ty * cols + tx] = { type: grid[ty][tx], x: tx * TILE_SIZE, y: ty * TILE_SIZE };
    }
  }

  return { tiles, grid, spawnX: spawn.x, spawnY: spawn.y };
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
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return "water";
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
