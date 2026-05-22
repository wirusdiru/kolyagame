export type GameState = "menu" | "playing" | "paused" | "gameover" | "win";

export type TileType =
  | "grass" | "grass2" | "tree" | "water" | "path" | "rock" | "wire" | "bush" | "mud" | "snow" | "sand";

export type BiomeType = "plains" | "forest" | "desert" | "snow" | "swamp" | "mountain";

export interface MapTile {
  type: TileType;
  x: number;
  y: number;
}

export interface Vec2 { x: number; y: number; }

export interface Entity {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export type EnemyType =
  | "vyaly_step" | "router" | "lag_ball" | "tree_ghost" | "wifi_drone"
  | "cable_snake" | "lag_ghost" | "provider_golem" | "child_swarm" | "rain_drop" | "kalyan_spirit";

export interface Enemy extends Entity {
  type: EnemyType;
  speed: number;
  vx: number;
  vy: number;
  angle: number;
  attackTimer: number;
  stun: number;
  phase?: number;
}

export type BossType =
  | "mega_router" | "super_vyaly" | "alien_king"
  | "kalyan_titan" | "internet_demon" | "water_tank" | "child_king"
  | "semen_god" | "step_mega" | "router_omega" | "alien_emperor" | "lag_beast";

export interface Boss extends Entity {
  type: BossType;
  phase: number;
  angle: number;
  attackTimer: number;
  moveTimer: number;
  special: number;
  targetX: number;
  targetY: number;
  scale: number;
  rage: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "water" | "beam" | "child" | "stink" | "bone" | "lag_shot" | "boss_ball" | "boss_laser" | "seed" | "cable";
  owner: "player" | "sabchak" | "enemy" | "boss";
  dmg: number;
  life: number;
  angle?: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  opacity: number;
  scale: number;
  color?: string;
}

export type ItemType =
  | "water_can" | "pizza" | "antenna" | "coin" | "bone_bag"
  | "kalyan_boost" | "alien_cell" | "stink_bomb" | "shield";

export interface Item {
  id: number;
  x: number;
  y: number;
  type: ItemType;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface GameStats {
  score: number;
  wave: number;
  level: number;
  enemiesKilled: number;
  bossesKilled: number;
  totalPullUps: number;
  waterCarried: number;
  childrenSpun: number;
  alienAbductions: number;
  coinsEarned: number;
}

export interface PlayerUpgrades {
  maxHp: number;
  waterCap: number;
  speed: number;
  stinkPower: number;
  alienCdReduce: number;
  sabDmg: number;
  waterEfficiency: number;
  regenBoost: number;
  alienDuration: number;
}

export type ShopUpgradeId = keyof PlayerUpgrades;

export type AbilityId =
  | "double_tap" | "stink_mega" | "water_splash" | "sab_fury"
  | "pullup_heal" | "rain_dance" | "traffic_steal" | "vyaly_bait";

export interface OwnedAbilities {
  double_tap: boolean;
  stink_mega: boolean;
  water_splash: boolean;
  sab_fury: boolean;
  pullup_heal: boolean;
  rain_dance: boolean;
  traffic_steal: boolean;
  vyaly_bait: boolean;
}

export type KolyaSkinId = "default" | "alien" | "raincoat" | "kalyan" | "kolya1";
export type SabSkinId = "default" | "pug" | "husky" | "cyber" | "golden";

export interface FriendEntry {
  username: string;
  addedAt: string;
}

export interface FriendRequestEntry {
  username: string;
  at: string;
}

export interface FriendPublicStatus {
  username: string;
  bestScore: number;
  lastSeenAt: string | null;
  isPlaying: boolean;
}

export interface ShopItem {
  id: ShopUpgradeId;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
  perLevel: number;
}

export interface InventorySlot {
  type: ItemType;
  count: number;
}

export interface UserProfile {
  username: string;
  passwordHash: string;
  totalCoins: number;
  upgrades: PlayerUpgrades;
  abilities: OwnedAbilities;
  ownedKolyaSkins: KolyaSkinId[];
  ownedSabSkins: SabSkinId[];
  equippedKolyaSkin: KolyaSkinId;
  equippedSabSkin: SabSkinId;
  friends: FriendEntry[];
  friendRequestsIn: FriendRequestEntry[];
  friendRequestsOut: FriendRequestEntry[];
  lastSeenAt: string;
  isPlaying: boolean;
  gamesPlayed: number;
  bestScore: number;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  wave: number;
  date: string;
}

export interface AuthState {
  loggedIn: boolean;
  username: string;
}
