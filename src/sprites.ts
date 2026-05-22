import type {
  BiomeType, Boss, Enemy, FloatingText, Item, KolyaSkinId,
  Projectile, SabSkinId, TileType,
} from "./types";
import { TILE_SIZE } from "./mapGenerator";

const TILE_COLORS: Record<TileType, [string, string]> = {
  grass: ["#2d5a27", "#3d7a35"],
  grass2: ["#3a6b32", "#4a8a42"],
  tree: ["#1b4d1b", "#2d6b2d"],
  water: ["#1a4a6e", "#2a6a9e"],
  path: ["#6b5a3a", "#8a7a55"],
  rock: ["#4a4a4a", "#6a6a6a"],
  wire: ["#5a3a1a", "#8a5a2a"],
  bush: ["#2a5a2a", "#3a7a3a"],
  mud: ["#4a3a20", "#6a5a30"],
  snow: ["#d8e8f0", "#b0c8d8"],
  sand: ["#c4a35a", "#a08040"],
};

const kolya1Img = new Image();
kolya1Img.src = "/skins/kolya1.png";
let kolya1ImgReady = false;
kolya1Img.onload = () => { kolya1ImgReady = true; };

export function drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, tick: number) {
  const [c1, c2] = TILE_COLORS[type];
  const g = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  if (type === "tree") {
    ctx.fillStyle = "#5a3a1a";
    ctx.fillRect(x + TILE_SIZE / 2 - 5, y + TILE_SIZE / 2, 10, 18);
    const tg = ctx.createRadialGradient(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 8, 4, x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 8, 20);
    tg.addColorStop(0, "#4caf50");
    tg.addColorStop(1, "#1b5e20");
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 8, 18, 0, Math.PI * 2);
    ctx.fillStyle = tg;
    ctx.fill();
  } else if (type === "water") {
    ctx.strokeStyle = `rgba(100,200,255,${0.3 + Math.sin(tick * 0.05 + x) * 0.15})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8 + i * 12, y + TILE_SIZE / 2 + Math.sin(tick * 0.08 + i) * 4);
      ctx.lineTo(x + 20 + i * 12, y + TILE_SIZE / 2 + Math.sin(tick * 0.08 + i + 1) * 4);
      ctx.stroke();
    }
  } else if (type === "rock") {
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.ellipse(x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#aaa";
    ctx.beginPath();
    ctx.ellipse(x + TILE_SIZE / 2 - 4, y + TILE_SIZE / 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "wire") {
    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + TILE_SIZE - 8);
    ctx.quadraticCurveTo(x + TILE_SIZE / 2, y + 8 + Math.sin(tick * 0.1) * 6, x + TILE_SIZE - 8, y + 12);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,100,0,${0.4 + Math.sin(tick * 0.2) * 0.3})`;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "bush") {
    ctx.fillStyle = "#388e3c";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + 14 + i * 10, y + TILE_SIZE / 2 + 4, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawKolya(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number,
  isAlien: boolean,
  pullup: boolean,
  skinId: KolyaSkinId = "default",
) {
  const bob = pullup ? Math.sin(tick * 0.5) * 12 : Math.sin(tick * 0.08) * 3;
  ctx.save();
  ctx.translate(x, y + bob);

  if (skinId === "kolya1" && kolya1ImgReady) {
    const pulse = 1 + Math.sin(tick * 0.12) * 0.04;
    const w = 72 * pulse;
    const h = 96 * pulse;
    ctx.shadowColor = "#44ff44";
    ctx.shadowBlur = 18 + Math.sin(tick * 0.15) * 8;
    ctx.drawImage(kolya1Img, -w / 2, -h + 20, w, h);
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const skinPalette: Record<KolyaSkinId, { skin: string; shirt: string }> = {
    default: { skin: "#ffcc99", shirt: "#3366cc" },
    raincoat: { skin: "#ffcc99", shirt: "#224466" },
    kalyan: { skin: "#ffcc99", shirt: "#663300" },
    alien: { skin: "#88ffaa", shirt: "#226633" },
    kolya1: { skin: "#aaff88", shirt: "#22aa22" },
  };
  const pal = isAlien
    ? { skin: "#88ffaa", shirt: "#226633" }
    : skinPalette[skinId] ?? skinPalette.default;
  const skin = pal.skin;
  const shirt = pal.shirt;
  const pants = skinId === "raincoat" ? "#1a3a5a" : "#223355";

  // Ноги (очень длинные — как чемодан)
  ctx.fillStyle = pants;
  ctx.fillRect(-8, 8, 7, 28);
  ctx.fillRect(1, 8, 7, 28);
  ctx.fillStyle = "#111";
  ctx.fillRect(-10, 34, 12, 6);
  ctx.fillRect(2, 34, 12, 6);

  // Тело высокое
  ctx.fillStyle = shirt;
  ctx.fillRect(-14, -18, 28, 28);
  // Вонь линии
  if (!isAlien && skinId !== "kolya1") {
    ctx.strokeStyle = `rgba(150,255,0,${0.4 + Math.sin(tick * 0.15) * 0.3})`;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 - i * 4, -10 + i * 5);
      ctx.quadraticCurveTo(-30 - i * 6, -20 + i * 8, -25 - i * 5, -30 + i * 6);
      ctx.stroke();
    }
  }

  // Голова
  const hg = ctx.createRadialGradient(-5, -38, 2, 0, -35, 18);
  hg.addColorStop(0, skin);
  hg.addColorStop(1, isAlien ? "#44aa66" : "#cc9955");
  ctx.beginPath();
  ctx.arc(0, -35, 16, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();

  // Глаза
  ctx.fillStyle = isAlien ? "#00ff88" : "#fff";
  ctx.beginPath();
  ctx.arc(-6, -37, 5, 0, Math.PI * 2);
  ctx.arc(6, -37, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isAlien ? "#004422" : "#224";
  ctx.beginPath();
  ctx.arc(-6, -37, 3, 0, Math.PI * 2);
  ctx.arc(6, -37, 3, 0, Math.PI * 2);
  ctx.fill();

  // Руки
  ctx.fillStyle = skin;
  const armSwing = pullup ? -0.8 : Math.sin(tick * 0.1) * 0.2;
  ctx.save();
  ctx.translate(-16, -8);
  ctx.rotate(armSwing);
  ctx.fillRect(-4, 0, 8, 22);
  ctx.restore();
  ctx.save();
  ctx.translate(16, -8);
  ctx.rotate(-armSwing);
  ctx.fillRect(-4, 0, 8, 22);
  ctx.restore();

  // Ведро воды
  ctx.fillStyle = "#4488ff";
  ctx.fillRect(18, 0, 14, 18);
  ctx.fillStyle = "#66aaff";
  ctx.fillRect(20, 2, 10, 8);

  if (skinId === "kolya1" && !isAlien) {
    ctx.strokeStyle = `rgba(80,255,80,${0.5 + Math.sin(tick * 0.2) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -35, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isAlien) {
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -35, 24, 0, Math.PI * 2);
    ctx.stroke();
    // Антенны
    ctx.beginPath();
    ctx.moveTo(-8, -50);
    ctx.lineTo(-12, -62);
    ctx.moveTo(8, -50);
    ctx.lineTo(12, -62);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawSabchak(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number,
  attacking: boolean,
  biting = false,
  skinId: SabSkinId = "default",
) {
  const bob = biting ? Math.sin(tick * 0.4) * 6 : Math.sin(tick * 0.12) * 3;
  const legPhase = Math.sin(tick * 0.15) * 3;
  ctx.save();
  ctx.translate(x, y + bob);

  const sabColors: Record<SabSkinId, [string, string, string]> = {
    default: ["#d4a017", "#8b6914", "#5a4008"],
    pug: ["#c8a070", "#8a6040", "#5a3820"],
    husky: ["#d0dce8", "#8090a0", "#506070"],
    cyber: ["#00e5cc", "#0088aa", "#004455"],
    golden: ["#ffd54f", "#daa520", "#a67c00"],
  };
  const [fur, furDark, nose] = sabColors[skinId] ?? sabColors.default;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(2, 20, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хвост сзади
  const tailWag = Math.sin(tick * 0.22) * 0.45;
  ctx.save();
  ctx.translate(-14, -2);
  ctx.rotate(tailWag);
  ctx.strokeStyle = fur;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -10, -10, -22);
  ctx.stroke();
  ctx.restore();

  // Тело
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-2, 4, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(-6, 6, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 лапы
  ctx.fillStyle = furDark;
  const legs = [[-10, 12], [-2, 12], [6, 12], [14, 12]] as const;
  legs.forEach(([lx, ly], i) => {
    const lift = (i % 2 === 0 ? legPhase : -legPhase) * (biting ? 0.3 : 1);
    ctx.fillRect(lx, ly + lift, 5, 10);
    ctx.fillStyle = "#222";
    ctx.fillRect(lx - 1, ly + 8 + lift, 7, 4);
    ctx.fillStyle = furDark;
  });

  // Голова + морда вперёд (собака, не кот)
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(16, -4, 11, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Морда
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(26, -2, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.ellipse(33, -3, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Висячие уши
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(10, -2, 5, 9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20, -2, 5, 9, 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(18, -6, 2.5, 0, Math.PI * 2);
  ctx.arc(24, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Язык при укусе
  if (biting) {
    ctx.fillStyle = "#f66";
    ctx.beginPath();
    ctx.ellipse(30, 2, 4, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (attacking && !biting) {
    ctx.fillStyle = "#eee";
    ctx.fillRect(34, -4, 12, 4);
    ctx.beginPath();
    ctx.arc(46, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawOnlinePlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number,
  username: string,
) {
  ctx.save();
  ctx.translate(x, y + Math.sin(tick * 0.1) * 2);
  ctx.globalAlpha = 0.92;
  drawKolya(ctx, 0, 0, tick, false, false, "default");
  ctx.globalAlpha = 1;
  ctx.font = "bold 10px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.fillText(username, 1, -58);
  ctx.fillStyle = "#6cf";
  ctx.fillText(username, 0, -59);
  ctx.restore();
}

export function skyColorsForBiome(biome: BiomeType, raining: boolean): [string, string, string] {
  if (raining) return ["#0a1020", "#152535", "#0d1a2e"];
  switch (biome) {
    case "snow": return ["#8ab0c8", "#c8dce8", "#e8f0f8"];
    case "desert": return ["#c89050", "#e8c070", "#d8a848"];
    case "swamp": return ["#1a2830", "#2a4038", "#1a3028"];
    case "mountain": return ["#506080", "#7088a0", "#405060"];
    default: return ["#1a2840", "#2a4030", "#1a3020"];
  }
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.stun > 0) {
    ctx.filter = "brightness(2) hue-rotate(90deg)";
    ctx.rotate(enemy.angle);
  }

  const t = enemy.type;
  if (t === "vyaly_step") {
    ctx.fillStyle = "#4a8a3a";
    ctx.fillRect(-12, -8, 24, 30);
    ctx.beginPath();
    ctx.arc(0, -18, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#8a6a4a";
    ctx.fill();
    ctx.fillStyle = "#2244aa";
    ctx.fillRect(10, -22, 16, 10);
    ctx.fillStyle = "rgba(0,150,255,0.6)";
    ctx.beginPath();
    ctx.arc(18, -20, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (t === "router") {
    ctx.fillStyle = "#1a5a8a";
    ctx.fillRect(-16, -10, 32, 22);
    ctx.fillStyle = "#00ff88";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-8 + i * 8, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#aad";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(Math.sin(tick * 0.1) * 5, -28);
    ctx.stroke();
  } else if (t === "lag_ball") {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
    g.addColorStop(0, "#ffff44");
    g.addColorStop(1, "#8844ff");
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(tick * 0.3) * 2, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  } else if (t === "tree_ghost") {
    ctx.globalAlpha = 0.7 + Math.sin(tick * 0.08) * 0.2;
    ctx.fillStyle = "#aaffcc";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#668";
    ctx.beginPath();
    ctx.arc(-5, -5, 4, 0, Math.PI * 2);
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (t === "wifi_drone") {
    ctx.fillStyle = "#555";
    ctx.fillRect(-14, -4, 28, 8);
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0af";
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 2 + tick * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
      ctx.stroke();
    }
  } else if (t === "cable_snake") {
    for (let s = 0; s < 6; s++) {
      const sx = Math.cos(tick * 0.1 + s * 0.5) * 8 - s * 5;
      const sy = Math.sin(tick * 0.1 + s * 0.5) * 4;
      ctx.fillStyle = s % 2 ? "#ff6600" : "#cc4400";
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (t === "lag_ghost") {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#88f";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LAG", 0, 5);
    ctx.globalAlpha = 1;
  } else if (t === "provider_golem") {
    ctx.fillStyle = "#444";
    ctx.fillRect(-18, -20, 36, 40);
    ctx.fillStyle = "#f44";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("НЕТ", 0, 0);
  } else if (t === "child_swarm") {
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#448";
    ctx.beginPath();
    ctx.arc(-3, -2, 2, 0, Math.PI * 2);
    ctx.arc(3, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (t === "rain_drop") {
    ctx.fillStyle = "#6af";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(8, 8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
  } else if (t === "kalyan_spirit") {
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#fa0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -8);
    ctx.stroke();
    ctx.fillStyle = "#a50";
    ctx.beginPath();
    ctx.ellipse(0, -12, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // HP bar
  const pct = enemy.hp / enemy.maxHp;
  ctx.fillStyle = "#222";
  ctx.fillRect(-18, -32, 36, 5);
  ctx.fillStyle = pct > 0.5 ? "#f44" : "#f80";
  ctx.fillRect(-18, -32, 36 * pct, 5);

  ctx.restore();
}

export function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const colors: Record<string, string> = {
    water: "#48f", beam: "#0f8", child: "#fa0", bone: "#eee",
    lag_shot: "#f44", boss_ball: "#f0f", boss_laser: "#ff0", seed: "#cc8", cable: "#f80", stink: "#af4",
  };
  const c = colors[p.type] ?? "#fff";
  if (p.type === "water") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === "beam") {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    g.addColorStop(0, "#fff");
    g.addColorStop(1, "#0f8");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === "child") {
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.fillRect(-4, -2, 8, 3);
  } else {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, 0, p.type === "boss_ball" ? 10 : 6, 0, Math.PI * 2);
    ctx.fill();
    if (p.owner === "boss") {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawItem(ctx: CanvasRenderingContext2D, item: Item, tick: number) {
  const bob = Math.sin(tick * 0.08 + item.id) * 4;
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
  glow.addColorStop(0, "rgba(255,220,0,0.4)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  const colors: Record<string, [string, string]> = {
    water_can: ["#48f", "#26a"], pizza: ["#f84", "#c52"], antenna: ["#888", "#aaa"],
    coin: ["#fd0", "#a80"], bone_bag: ["#eee", "#ccc"], kalyan_boost: ["#a50", "#630"],
    alien_cell: ["#0f8", "#084"], stink_bomb: ["#af4", "#6a2"], shield: ["#8cf", "#48a"],
  };
  const [c1, c2] = colors[item.type] ?? ["#fff", "#ccc"];
  const g = ctx.createLinearGradient(-10, -10, 10, 10);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-10, -10, 20, 20, 4);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawStinkAura(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, tick: number) {
  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(tick * 0.1) * 0.1;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, "rgba(150,255,0,0.4)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(150,255,0,0.5)";
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = tick;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawBossSimple(ctx: CanvasRenderingContext2D, boss: Boss, tick: number) {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const pulse = 1 + Math.sin(tick * 0.08) * 0.05;
  ctx.scale(boss.scale * pulse, boss.scale * pulse);
  const colors: Record<string, string> = {
    mega_router: "#1a8", super_vyaly: "#4a4", alien_king: "#a4a",
    kalyan_titan: "#a60", internet_demon: "#f04", water_tank: "#48f",
    child_king: "#fa0", semen_god: "#cc8", step_mega: "#282",
    router_omega: "#08f", alien_emperor: "#f0f", lag_beast: "#84f",
  };
  const c = colors[boss.type] ?? "#f00";
  const g = ctx.createRadialGradient(0, -20, 5, 0, 0, 50);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.3, c);
  g.addColorStop(1, boss.rage ? "#800" : "#222");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 45, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (boss.rage) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + tick * 0.05;
      ctx.fillStyle = `hsla(${i * 60},100%,60%,0.6)`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 55, Math.sin(a) * 40, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const ft of texts) {
    if (ft.life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life / 130);
    ctx.font = "bold 13px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
