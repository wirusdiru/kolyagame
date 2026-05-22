import type { BiomeType, MapTile, TileType } from "./types";

export const TILE_SIZE = 48;
export const CHUNK_TILES = 16;
export const CHUNK_PX = CHUNK_TILES * TILE_SIZE;

/** Расширять мир, когда игрок ближе этого к краю загруженной области */
const EXPAND_MARGIN_PX = 520;
/** Сколько чанков добавить за один кадр при расширении */
const EXPAND_RING = 2;
/** Максимум чанков в памяти (старые не удаляются — только лимит на новые) */
const MAX_CHUNKS = 900;

export type TileGrid = TileType[][];

export interface MapData {
  tiles: MapTile[];
  grid: TileGrid;
  spawnX: number;
  spawnY: number;
  seed: number;
}

interface Chunk {
  cx: number;
  cy: number;
  grid: TileGrid;
  biome: BiomeType;
}

function chunkKey(cx: number, cy: number) {
  return `${cx},${cy}`;
}

function seededRandom(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noise(tx: number, ty: number, seed: number): number {
  return seededRandom(tx * 374761 + ty * 668265 + seed * 982451)();
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

function pickBiome(temp: number, humid: number, elev: number): BiomeType {
  if (elev > 0.72) return "mountain";
  if (temp < 0.28) return "snow";
  if (temp > 0.68 && humid < 0.38) return "desert";
  if (humid > 0.62 && temp > 0.35 && temp < 0.62) return "swamp";
  if (humid > 0.52 && elev < 0.55) return "forest";
  return "plains";
}

function baseTileForBiome(biome: BiomeType, detail: number, paths: number): TileType {
  if (paths > 0.72 && detail < 0.45) return "path";
  switch (biome) {
    case "snow": return detail > 0.7 ? "rock" : "snow";
    case "desert": return detail > 0.75 ? "rock" : "sand";
    case "swamp": return detail < 0.12 ? "water" : detail < 0.2 ? "mud" : "grass";
    case "mountain": return detail > 0.55 ? "rock" : elevGrass(detail);
    case "forest": return detail > 0.65 ? "grass2" : "grass";
    default: return detail > 0.6 ? "grass2" : "grass";
  }
}

function elevGrass(detail: number): TileType {
  return detail > 0.5 ? "grass2" : "grass";
}

/** Редкие деревья — не стены: шум + соседи */
function shouldPlaceTree(
  worldTx: number,
  worldTy: number,
  biome: BiomeType,
  detail: number,
  getType: (tx: number, ty: number) => TileType | null,
): boolean {
  if (biome !== "forest" && biome !== "swamp" && biome !== "plains") return false;
  if (detail < 0.88) return false;
  const forestRoll = fbm(worldTx * 3.1, worldTy * 3.1, 9191, 0.15);
  if (forestRoll < 0.62) return false;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = getType(worldTx + dx, worldTy + dy);
      if (t === "tree" || t === "rock" || t === "water") return false;
    }
  }
  return true;
}

export class InfiniteWorld {
  readonly seed: number;
  private chunks = new Map<string, Chunk>();
  minCx = 0;
  maxCx = 0;
  minCy = 0;
  maxCy = 0;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1_000_000_000);
    this.ensureSpawnArea();
  }

  private ensureSpawnArea() {
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        this.generateChunk(cx, cy);
      }
    }
    this.clearSpawnPatch();
  }

  /** Площадка старта без деревьев */
  private clearSpawnPatch() {
    for (let ty = -4; ty <= 4; ty++) {
      for (let tx = -4; tx <= 4; tx++) {
        if (tx * tx + ty * ty < 20) {
          this.setTileAt(tx, ty, tx * tx + ty * ty < 9 ? "path" : "grass");
        }
      }
    }
  }

  private setTileAt(worldTx: number, worldTy: number, type: TileType) {
    const cx = Math.floor(worldTx / CHUNK_TILES);
    const cy = Math.floor(worldTy / CHUNK_TILES);
    const lx = ((worldTx % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
    const ly = ((worldTy % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
    const ch = this.chunks.get(chunkKey(cx, cy));
    if (ch) ch.grid[ly][lx] = type;
  }

  generateChunk(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    if (this.chunks.size >= MAX_CHUNKS) {
      return existing ?? this.chunks.values().next().value!;
    }

    const grid: TileGrid = [];
    const centerTx = cx * CHUNK_TILES + CHUNK_TILES / 2;
    const centerTy = cy * CHUNK_TILES + CHUNK_TILES / 2;
    const temp0 = fbm(centerTx, centerTy, this.seed, 0.004);
    const humid0 = fbm(centerTx, centerTy, this.seed + 111, 0.004);
    const elev0 = fbm(centerTx, centerTy, this.seed + 222, 0.008);
    const biome = pickBiome(temp0, humid0, elev0);

    const getType = (wtx: number, wty: number): TileType | null => {
      const ccx = Math.floor(wtx / CHUNK_TILES);
      const ccy = Math.floor(wty / CHUNK_TILES);
      const ch = this.chunks.get(chunkKey(ccx, ccy));
      if (!ch) return null;
      const lx = ((wtx % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
      const ly = ((wty % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
      return ch.grid[ly]?.[lx] ?? null;
    };

    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      grid[ly] = [];
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const wtx = cx * CHUNK_TILES + lx;
        const wty = cy * CHUNK_TILES + ly;
        const elev = fbm(wtx, wty, this.seed + 222, 0.02);
        const humid = fbm(wtx, wty, this.seed + 111, 0.015);
        const detail = fbm(wtx, wty, this.seed + 333, 0.05);
        const paths = fbm(wtx, wty, this.seed + 444, 0.018);
        const tileBiome = pickBiome(
          fbm(wtx, wty, this.seed, 0.004),
          humid,
          elev,
        );
        let type = baseTileForBiome(tileBiome, detail, paths);

        if (tileBiome === "mountain" && detail > 0.8 && elev > 0.65) type = "rock";
        if (tileBiome === "swamp" && detail < 0.08) type = "water";
        if (tileBiome === "desert" && detail > 0.82) type = "bush";
        if (detail > 0.9 && tileBiome === "plains" && paths < 0.5) type = "bush";

        grid[ly][lx] = type;
      }
    }

    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const wtx = cx * CHUNK_TILES + lx;
        const wty = cy * CHUNK_TILES + ly;
        const detail = fbm(wtx, wty, this.seed + 333, 0.05);
        const tileBiome = pickBiome(
          fbm(wtx, wty, this.seed, 0.004),
          fbm(wtx, wty, this.seed + 111, 0.015),
          fbm(wtx, wty, this.seed + 222, 0.02),
        );
        if (shouldPlaceTree(wtx, wty, tileBiome, detail, getType)) {
          grid[ly][lx] = "tree";
        }
      }
    }

    const chunk: Chunk = { cx, cy, grid, biome };
    this.chunks.set(key, chunk);
    this.minCx = Math.min(this.minCx, cx);
    this.maxCx = Math.max(this.maxCx, cx);
    this.minCy = Math.min(this.minCy, cy);
    this.maxCy = Math.max(this.maxCy, cy);
    return chunk;
  }

  ensureNear(wx: number, wy: number) {
    const pcx = Math.floor(wx / CHUNK_PX);
    const pcy = Math.floor(wy / CHUNK_PX);
    const marginChunks = Math.ceil(EXPAND_MARGIN_PX / CHUNK_PX) + EXPAND_RING;

    if (
      pcx <= this.minCx + marginChunks ||
      pcx >= this.maxCx - marginChunks ||
      pcy <= this.minCy + marginChunks ||
      pcy >= this.maxCy - marginChunks
    ) {
      for (let cy = pcy - marginChunks - EXPAND_RING; cy <= pcy + marginChunks + EXPAND_RING; cy++) {
        for (let cx = pcx - marginChunks - EXPAND_RING; cx <= pcx + marginChunks + EXPAND_RING; cx++) {
          this.generateChunk(cx, cy);
        }
      }
    } else {
      for (let cy = pcy - 2; cy <= pcy + 2; cy++) {
        for (let cx = pcx - 2; cx <= pcx + 2; cx++) {
          this.generateChunk(cx, cy);
        }
      }
    }
  }

  getTile(wx: number, wy: number): TileType {
    const wtx = Math.floor(wx / TILE_SIZE);
    const wty = Math.floor(wy / TILE_SIZE);
    const cx = Math.floor(wtx / CHUNK_TILES);
    const cy = Math.floor(wty / CHUNK_TILES);
    const ch = this.chunks.get(chunkKey(cx, cy)) ?? this.generateChunk(cx, cy);
    const lx = ((wtx % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
    const ly = ((wty % CHUNK_TILES) + CHUNK_TILES) % CHUNK_TILES;
    return ch.grid[ly]?.[lx] ?? "grass";
  }

  getBiomeAt(wx: number, wy: number): BiomeType {
    const wtx = Math.floor(wx / TILE_SIZE);
    const wty = Math.floor(wy / TILE_SIZE);
    const temp = fbm(wtx, wty, this.seed, 0.004);
    const humid = fbm(wtx, wty, this.seed + 111, 0.004);
    const elev = fbm(wtx, wty, this.seed + 222, 0.008);
    return pickBiome(temp, humid, elev);
  }

  /** Срез для миникарты / совместимости */
  getLegacyGrid(): TileGrid {
    const rows: TileGrid = [];
    for (let cy = this.minCy; cy <= this.maxCy; cy++) {
      for (let ly = 0; ly < CHUNK_TILES; ly++) {
        const row: TileType[] = [];
        for (let cx = this.minCx; cx <= this.maxCx; cx++) {
          const ch = this.chunks.get(chunkKey(cx, cy));
          if (ch) row.push(...ch.grid[ly]);
          else {
            for (let i = 0; i < CHUNK_TILES; i++) row.push("grass");
          }
        }
        rows.push(row);
      }
    }
    return rows.length ? rows : [["grass"]];
  }

  getSpawn(): { x: number; y: number } {
    return { x: TILE_SIZE * 0.5, y: TILE_SIZE * 0.5 };
  }

  /** Тайлы в области камеры для отрисовки */
  tilesInView(camX: number, camY: number, vw: number, vh: number): { type: TileType; x: number; y: number; biome: BiomeType }[] {
    const out: { type: TileType; x: number; y: number; biome: BiomeType }[] = [];
    const tx0 = Math.floor((camX - vw / 2) / TILE_SIZE) - 1;
    const tx1 = Math.ceil((camX + vw / 2) / TILE_SIZE) + 1;
    const ty0 = Math.floor((camY - vh / 2) / TILE_SIZE) - 1;
    const ty1 = Math.ceil((camY + vh / 2) / TILE_SIZE) + 1;

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const cx = Math.floor(tx / CHUNK_TILES);
        const cy = Math.floor(ty / CHUNK_TILES);
        this.generateChunk(cx, cy);
        const wx = tx * TILE_SIZE;
        const wy = ty * TILE_SIZE;
        out.push({
          type: this.getTile(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2),
          x: wx,
          y: wy,
          biome: this.getBiomeAt(wx, wy),
        });
      }
    }
    return out;
  }
}

export function isTileBlocking(type: TileType): boolean {
  return type === "tree" || type === "rock" || type === "water";
}

export function getTileSpeed(type: TileType): number {
  if (type === "mud") return 0.82;
  if (type === "bush") return 0.78;
  if (type === "sand") return 0.9;
  if (type === "snow") return 0.88;
  return 1;
}

export function isWalkableWorld(world: InfiniteWorld, wx: number, wy: number): boolean {
  world.ensureNear(wx, wy);
  return !isTileBlocking(world.getTile(wx, wy));
}

export function findLandPosition(
  world: InfiniteWorld,
  nearX: number,
  nearY: number,
  minDist: number,
  maxDist: number,
  attempts = 50,
): { x: number; y: number } {
  world.ensureNear(nearX, nearY);
  for (let i = 0; i < attempts; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = minDist + Math.random() * (maxDist - minDist);
    const x = nearX + Math.cos(a) * d;
    const y = nearY + Math.sin(a) * d;
    if (
      isWalkableWorld(world, x, y) &&
      isWalkableWorld(world, x + 24, y) &&
      isWalkableWorld(world, x, y + 24)
    ) {
      return { x, y };
    }
  }
  return { x: nearX, y: nearY };
}

/** @deprecated — для старых импортов */
export const WORLD_W = 999999;
export const WORLD_H = 999999;

export function generateMap(seed?: number): MapData {
  const w = new InfiniteWorld(seed);
  const spawn = w.getSpawn();
  return {
    tiles: [],
    grid: w.getLegacyGrid(),
    spawnX: spawn.x,
    spawnY: spawn.y,
    seed: w.seed,
  };
}

export function getTileFromGrid(_grid: TileGrid, wx: number, wy: number): TileType {
  return "grass";
}

export function isWalkable(_grid: TileGrid, wx: number, wy: number): boolean {
  return true;
}
