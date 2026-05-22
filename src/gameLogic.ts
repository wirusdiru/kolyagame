import type {
  Boss, Enemy, FloatingText, GameStats, Item, ItemType,
  OwnedAbilities, PlayerUpgrades,
} from "./types";
import { ALL_BOSS_TYPES, ENEMY_POINTS, isBossWave } from "./constants";
import { findLandPosition, type InfiniteWorld } from "./infiniteWorld";

let _id = 1;
export const nextId = () => _id++;
export const resetIds = () => { _id = 1; };

const ALL_ENEMY_TYPES: Enemy["type"][] = [
  "vyaly_step", "router", "lag_ball", "tree_ghost", "wifi_drone",
  "cable_snake", "lag_ghost", "provider_golem", "child_swarm", "rain_drop", "kalyan_spirit",
];

function getAvailableEnemies(wave: number): Enemy["type"][] {
  if (wave < 2) return ALL_ENEMY_TYPES.slice(0, 5);
  if (wave < 4) return ALL_ENEMY_TYPES.slice(0, 7);
  if (wave < 6) return ALL_ENEMY_TYPES.slice(0, 9);
  return ALL_ENEMY_TYPES;
}

export function spawnEnemy(
  wave: number, playerX: number, playerY: number, world: InfiniteWorld, partySize = 1,
): Enemy {
  const partyMult = 1 + (partySize - 1) * 0.55;
  const available = getAvailableEnemies(wave);
  const type = available[Math.floor(Math.random() * available.length)] ?? "vyaly_step";
  const pos = findLandPosition(world, playerX, playerY, 320, 520);
  const x = pos.x;
  const y = pos.y;

  const hpMap: Record<Enemy["type"], number> = {
    vyaly_step: 15 + wave * 3,
    router: 12 + wave * 2,
    lag_ball: 9 + wave * 2,
    tree_ghost: 17 + wave * 3,
    wifi_drone: 11 + wave * 2,
    cable_snake: 14 + wave * 3,
    lag_ghost: 15 + wave * 3,
    provider_golem: 24 + wave * 4,
    child_swarm: 9 + wave * 2,
    rain_drop: 10 + wave * 2,
    kalyan_spirit: 19 + wave * 3,
  };
  const speedMap: Record<Enemy["type"], number> = {
    vyaly_step: 1.25 + wave * 0.07,
    router: 0.85 + wave * 0.05,
    lag_ball: 2.15 + wave * 0.1,
    tree_ghost: 0.62 + wave * 0.04,
    wifi_drone: 2.45 + wave * 0.11,
    cable_snake: 1.75 + wave * 0.09,
    lag_ghost: 1.05 + wave * 0.06,
    provider_golem: 0.55 + wave * 0.03,
    child_swarm: 2.75 + wave * 0.12,
    rain_drop: 2.95 + wave * 0.13,
    kalyan_spirit: 1.45 + wave * 0.08,
  };
  const hp = Math.floor(hpMap[type] * partyMult);
  const spd = speedMap[type] * (1 + (partySize - 1) * 0.08);
  return {
    id: nextId(), x, y, hp, maxHp: hp,
    type, speed: spd,
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

const LOOT_WEIGHTS: { type: ItemType; w: number }[] = [
  { type: "pizza", w: 22 }, { type: "shield", w: 18 }, { type: "water_can", w: 20 },
  { type: "coin", w: 16 }, { type: "bone_bag", w: 14 }, { type: "antenna", w: 8 },
  { type: "kalyan_boost", w: 5 }, { type: "alien_cell", w: 4 }, { type: "stink_bomb", w: 3 },
];

function rollLootType(): ItemType {
  const sum = LOOT_WEIGHTS.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * sum;
  for (const e of LOOT_WEIGHTS) {
    r -= e.w;
    if (r <= 0) return e.type;
  }
  return "coin";
}

export function spawnItem(x: number, y: number, forceType?: ItemType): Item {
  return { id: nextId(), x, y, type: forceType ?? rollLootType() };
}

export const ITEM_PICKUP_LABELS: Record<ItemType, string> = {
  water_can: "+30Л воды", pizza: "+30 HP", antenna: "+50 очков", coin: "+25 очков",
  bone_bag: "+15 HP", kalyan_boost: "+80 очков", alien_cell: "+40 очков",
  stink_bomb: "+30 очков", shield: "ЩИТ!",
};

export { isBossWave };

export function getWaveTarget(wave: number, partySize = 1): number {
  const base = 24 + wave * 9 + Math.floor(wave / 3) * 8;
  return Math.floor(base * (1 + (partySize - 1) * 0.35));
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

export function applyUpgrades(
  base: { maxHp: number; waterCap: number; speed: number },
  up: PlayerUpgrades,
  abilities?: OwnedAbilities,
) {
  const alienFreezeSec = 3 + up.alienDuration * 1.75 + (abilities?.traffic_steal ? 1 : 0);
  return {
    maxHp: base.maxHp + up.maxHp * 7,
    waterCap: base.waterCap + up.waterCap * 5,
    speed: base.speed * (1 + up.speed * 0.025),
    stinkDmg: 4 + up.stinkPower,
    alienCd: Math.max(3200, Math.floor(3600 * (1 - up.alienCdReduce * 0.05))),
    alienFreezeMax: Math.min(540, Math.round(alienFreezeSec * 60)),
    sabDmg: 10 + up.sabDmg * 2,
    waterPerShot: Math.max(1.5, 3 - up.waterEfficiency * 0.15 - (abilities?.water_splash ? 0.75 : 0)),
    stinkRadiusMult: 1 + (abilities?.stink_mega ? 0.12 : 0),
    regenOnStink: up.regenBoost,
    doubleShot: abilities?.double_tap ?? false,
    sabFury: abilities?.sab_fury ?? false,
    pullupHealBonus: abilities?.pullup_heal ? 5 : 0,
    rainSpeed: abilities?.rain_dance ? 1.12 : 1,
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

/** Монеты за забег */
export function coinsForRun(score: number, wave: number): number {
  const fromScore = Math.floor(score / 12);
  const fromWave = Math.min(48, Math.floor(wave * 2.5));
  return Math.max(14, Math.min(220, fromScore + fromWave));
}

export function getWaveModifier(wave: number): string {
  const mods = ["", "УСКОРЕНИЕ", "ДВОЙНОЙ СПАВН", "ТУМАН ВОНИ", "ШТОРМ ЛАГОВ", "КРОВАВЫЙ ДОЖДЬ"];
  return mods[wave % mods.length] ?? "";
}
