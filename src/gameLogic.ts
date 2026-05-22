import type { Boss, Enemy, FloatingText, GameStats, Item, ItemType, PlayerUpgrades } from "./types";
import { ALL_BOSS_TYPES, ENEMY_POINTS, isBossWave } from "./constants";
import { findLandPosition, type TileGrid } from "./mapGenerator";

let _id = 1;
export const nextId = () => _id++;
export const resetIds = () => { _id = 1; };

const ALL_ENEMY_TYPES: Enemy["type"][] = [
  "vyaly_step", "router", "lag_ball", "tree_ghost", "wifi_drone",
  "cable_snake", "lag_ghost", "provider_golem", "child_swarm", "rain_drop", "kalyan_spirit",
];

function getAvailableEnemies(wave: number): Enemy["type"][] {
  if (wave < 2) return ALL_ENEMY_TYPES.slice(0, 2);
  if (wave < 4) return ALL_ENEMY_TYPES.slice(0, 4);
  if (wave < 7) return ALL_ENEMY_TYPES.slice(0, 7);
  if (wave < 12) return ALL_ENEMY_TYPES.slice(0, 9);
  return ALL_ENEMY_TYPES;
}

export function spawnEnemy(wave: number, playerX: number, playerY: number, grid: TileGrid): Enemy {
  const available = getAvailableEnemies(wave);
  const type = available[Math.floor(Math.random() * available.length)];
  const pos = findLandPosition(grid, playerX, playerY, 320, 520);
  const x = pos.x;
  const y = pos.y;

  const hpMap: Record<Enemy["type"], number> = {
    vyaly_step: 8 + wave * 2,
    router: 6 + wave * 2,
    lag_ball: 3 + wave,
    tree_ghost: 10 + wave * 2,
    wifi_drone: 5 + wave * 2,
    cable_snake: 7 + wave * 2,
    lag_ghost: 9 + wave * 2,
    provider_golem: 14 + wave * 3,
    child_swarm: 4 + Math.floor(wave / 2),
    rain_drop: 4 + wave,
    kalyan_spirit: 12 + wave * 2,
  };
  const speedMap: Record<Enemy["type"], number> = {
    vyaly_step: 1.2 + wave * 0.07,
    router: 0.8 + wave * 0.05,
    lag_ball: 2.2 + wave * 0.1,
    tree_ghost: 0.6 + wave * 0.04,
    wifi_drone: 2.5 + wave * 0.11,
    cable_snake: 1.8 + wave * 0.09,
    lag_ghost: 1.0 + wave * 0.06,
    provider_golem: 0.5 + wave * 0.03,
    child_swarm: 2.8 + wave * 0.12,
    rain_drop: 3.0 + wave * 0.13,
    kalyan_spirit: 1.4 + wave * 0.08,
  };
  const hp = hpMap[type];
  return {
    id: nextId(), x, y, hp, maxHp: hp,
    type, speed: speedMap[type],
    vx: 0, vy: 0, angle: 0, attackTimer: 0, stun: 0, phase: Math.random() * Math.PI * 2,
  };
}

export function spawnBoss(wave: number, playerX: number, playerY: number): Boss {
  const bossIndex = Math.floor(wave / 5) - 1;
  const type = ALL_BOSS_TYPES[bossIndex % ALL_BOSS_TYPES.length];
  const hp = 180 + wave * 45 + bossIndex * 30;
  return {
    id: nextId(),
    x: playerX + (Math.random() > 0.5 ? 200 : -200),
    y: playerY - 250,
    hp, maxHp: hp,
    type,
    phase: 1,
    angle: 0,
    attackTimer: 0,
    moveTimer: 0,
    special: 0,
    targetX: playerX,
    targetY: playerY - 100,
    scale: 1.3 + Math.min(0.5, wave * 0.02),
    rage: false,
  };
}

export function spawnItem(x: number, y: number, forceType?: ItemType): Item {
  const types: ItemType[] = [
    "water_can", "pizza", "antenna", "coin", "bone_bag",
    "kalyan_boost", "alien_cell", "stink_bomb", "shield",
  ];
  return {
    id: nextId(),
    x, y,
    type: forceType ?? types[Math.floor(Math.random() * types.length)],
  };
}

export { isBossWave };

export function getWaveTarget(wave: number): number {
  return 10 + wave * 4 + Math.floor(wave / 5) * 5;
}

export function getEnemyPoints(type: Enemy["type"]): number {
  return ENEMY_POINTS[type] ?? 20;
}

export function applyItemEffect(
  type: Item["type"],
  stats: { hp: number; maxHp: number; water: number; waterCap: number; score: number; invincible: number }
) {
  switch (type) {
    case "water_can": return { ...stats, water: Math.min(stats.waterCap, stats.water + 30) };
    case "pizza": return { ...stats, hp: Math.min(stats.maxHp, stats.hp + 30) };
    case "antenna": return { ...stats, score: stats.score + 50 };
    case "coin": return { ...stats, score: stats.score + 25 };
    case "bone_bag": return { ...stats, hp: Math.min(stats.maxHp, stats.hp + 15) };
    case "kalyan_boost": return { ...stats, score: stats.score + 80 };
    case "alien_cell": return { ...stats, score: stats.score + 40 };
    case "stink_bomb": return { ...stats, score: stats.score + 30 };
    case "shield": return { ...stats, invincible: Math.max(stats.invincible, 120) };
    default: return stats;
  }
}

export function applyUpgrades(base: { maxHp: number; waterCap: number; speed: number }, up: PlayerUpgrades) {
  return {
    maxHp: base.maxHp + up.maxHp * 15,
    waterCap: base.waterCap + up.waterCap * 10,
    speed: base.speed * (1 + up.speed * 0.05),
    stinkDmg: 5 + up.stinkPower * 3,
    alienCd: Math.floor(600 * (1 - up.alienCdReduce * 0.08)),
    sabDmg: 12 + up.sabDmg * 4,
  };
}

export function createFloatingText(
  x: number, y: number, text: string, color = "#fff", stack = 0,
): FloatingText {
  return {
    id: nextId(),
    x: x + (stack % 3 - 1) * 18,
    y: y - 35 - (stack % 5) * 16,
    text, color, life: 130, vy: -0.85,
  };
}

export function emptyStats(): GameStats {
  return {
    score: 0, wave: 1, level: 1,
    enemiesKilled: 0, bossesKilled: 0,
    totalPullUps: 0, waterCarried: 0,
    childrenSpun: 0, alienAbductions: 0,
    coinsEarned: 0,
  };
}

export function getWaveModifier(wave: number): string {
  const mods = ["", "УСКОРЕНИЕ", "ДВОЙНОЙ СПАВН", "ТУМАН ВОНИ", "ШТОРМ ЛАГОВ", "КРОВАВЫЙ ДОЖДЬ"];
  return mods[wave % mods.length] ?? "";
}
