import type { Boss, Enemy, FloatingText, Item, Projectile } from "./types";

/** Снимок мира для canvas — обновляется в game loop без React */
export interface WorldSnapshot {
  kx: number;
  ky: number;
  sabX: number;
  sabY: number;
  sabHp: number;
  sabAttacking: boolean;
  isAlien: boolean;
  pullupAnim: boolean;
  stinkActive: boolean;
  stinkRadius: number;
  enemies: Enemy[];
  boss: Boss | null;
  projectiles: Projectile[];
  items: Item[];
  floatingTexts: FloatingText[];
  isRaining: boolean;
  tick: number;
  wave: number;
  kolyaSkin: import("./types").KolyaSkinId;
  sabSkin: import("./types").SabSkinId;
  sabBiting: boolean;
  biomeLabel: string;
}

export function emptyWorld(): WorldSnapshot {
  return {
    kx: 0, ky: 0, sabX: 0, sabY: 0, sabHp: 80, sabAttacking: false,
    isAlien: false, pullupAnim: false, stinkActive: false, stinkRadius: 130,
    enemies: [], boss: null, projectiles: [], items: [], floatingTexts: [],
    isRaining: false, tick: 0, wave: 1,
    kolyaSkin: "default", sabSkin: "default", sabBiting: false, biomeLabel: "",
  };
}
