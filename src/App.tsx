import { useState, useEffect, useRef, useCallback } from "react";
import type {
  GameState, Enemy, Boss, Projectile, Item, FloatingText,
  GameStats, UserProfile,
} from "./types";
import {
  KOLAY_NICKNAMES, STINK_MESSAGES, INTERNET_MESSAGES,
  SABCHAK_PHRASES, POCKET_STUFF, BOSS_NAMES, BIOME_NAMES, WORLD_EVENTS,
  WATER_REFILL_BELOW,
} from "./constants";
import { playSfx } from "./audio";
import {
  nextId, resetIds, spawnEnemy, spawnBoss, spawnItem, isBossWave,
  applyItemEffect, createFloatingText, emptyStats, getWaveTarget,
  getEnemyPoints, applyUpgrades, getWaveModifier, coinsForRun, ITEM_PICKUP_LABELS,
} from "./gameLogic";
import {
  InfiniteWorld, getTileSpeed, isWalkableWorld, findLandPosition, TILE_SIZE,
} from "./infiniteWorld";
import type { KolyaSkinId, OwnedAbilities, SabSkinId } from "./types";
import * as storage from "./storage";
import GameCanvas from "./components/GameCanvas";
import Boss3D from "./components/Boss3D";
import { emptyWorld, type WorldSnapshot } from "./worldRef";
import Minimap from "./components/Minimap";
import MenuScreen from "./screens/MenuScreen";
import PauseOverlay from "./screens/PauseOverlay";
import GameOverScreen from "./screens/GameOverScreen";

const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randOf = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [user, setUser] = useState<UserProfile | null>(null);

  const refreshUser = useCallback(() => {
    storage.fetchCurrentUser().then(setUser);
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  useEffect(() => {
    if (gameState === "menu") void storage.setPresence(false);
  }, [gameState]);
  const [screenW, setScreenW] = useState(window.innerWidth);
  const [screenH, setScreenH] = useState(window.innerHeight);
  const infiniteWorldRef = useRef(new InfiniteWorld(Date.now()));
  const [hudTick, setHudTick] = useState(0);
  const [biomeLabel, setBiomeLabel] = useState("Луга");
  const [kolyaSkin, setKolyaSkin] = useState<KolyaSkinId>("default");
  const [sabSkin, setSabSkin] = useState<SabSkinId>("default");
  const kolyaSkinRef = useRef<KolyaSkinId>("default");
  const sabSkinRef = useRef<SabSkinId>("default");
  const abilitiesRef = useRef<OwnedAbilities | null>(null);
  const waterPerShotRef = useRef(3);
  const stinkRadiusMultRef = useRef(1);
  const alienFreezeTimerRef = useRef(0);
  const alienMaxFreezeRef = useRef(600);
  const alienTriggerRef = useRef(false);
  const doubleShotRef = useRef(false);
  const sabFuryRef = useRef(false);
  const pullupHealBonusRef = useRef(0);
  const rainSpeedRef = useRef(1);
  const regenStinkRef = useRef(0);
  const sabBiteTargetRef = useRef<number | null>(null);
  const sabBitingRef = useRef(false);
  const isDeadRef = useRef(false);
  const pullupCdRef = useRef(0);

  const spawn = infiniteWorldRef.current.getSpawn();
  const [kx, setKx] = useState(spawn.x);
  const [ky, setKy] = useState(spawn.y);
  const [kolyaHp, setKolyaHp] = useState(150);
  const [kolyaMaxHp, setKolyaMaxHp] = useState(150);
  const [water, setWater] = useState(75);
  const [waterCap, setWaterCap] = useState(75);
  const [isAlien, setIsAlien] = useState(false);
  const [alienCooldown, setAlienCooldown] = useState(0);
  const [alienMaxCd, setAlienMaxCd] = useState(3600);
  const [alienMaxFreezeDisp, setAlienMaxFreezeDisp] = useState(3);
  const [alienFreezeLeft, setAlienFreezeLeft] = useState(0);
  const [pullUps, setPullUps] = useState(0);
  const [pullupAnim, setPullupAnim] = useState(false);
  const [isRaining, setIsRaining] = useState(false);
  const [stinkRadius, setStinkRadius] = useState(false);
  const [stinkPower, setStinkPower] = useState(5);
  const [invincible, setInvincible] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(3.8);

  const [sabX, setSabX] = useState(spawn.x + 60);
  const [sabY, setSabY] = useState(spawn.y + 40);
  const [sabHp, setSabHp] = useState(80);
  const [sabMaxHp] = useState(80);
  const [sabDmg, setSabDmg] = useState(12);
  const [sabPhrase, setSabPhrase] = useState("");
  const [sabAttackTimer, setSabAttackTimer] = useState(0);

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const floatStackRef = useRef(0);
  const bannerBusyUntilRef = useRef(0);
  const worldRef = useRef<WorldSnapshot>(emptyWorld());
  const [stats, setStats] = useState<GameStats>(emptyStats());

  const [nickname, setNickname] = useState(KOLAY_NICKNAMES[0]);
  const [internetMsg, setInternetMsg] = useState("");
  const [internetDown, setInternetDown] = useState(false);
  const [stinkMsg, setStinkMsg] = useState("");
  const [pocketMsg, setPocketMsg] = useState("");
  const [shakeScreen, setShakeScreen] = useState(false);
  const [waveAnnounce, setWaveAnnounce] = useState("");
  const [bossWarning, setBossWarning] = useState(false);
  const [xpBar, setXpBar] = useState(0);
  const [tick, setTick] = useState(0);
  const [waveModifier, setWaveModifier] = useState("");

  const keysRef = useRef<Set<string>>(new Set());
  const loopRef = useRef(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const tickRef = useRef(0);
  const kxRef = useRef(spawn.x);
  const kyRef = useRef(spawn.y);
  const sabXRef = useRef(spawn.x + 60);
  const sabYRef = useRef(spawn.y + 40);
  const enemiesRef = useRef<Enemy[]>([]);
  const bossRef = useRef<Boss | null>(null);
  const projRef = useRef<Projectile[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const statsRef = useRef<GameStats>(emptyStats());
  const kolyaHpRef = useRef(150);
  const kolyaMaxHpRef = useRef(150);
  const waterRef = useRef(75);
  const waterCapRef = useRef(75);
  const isAlienRef = useRef(false);
  const alienCooldownRef = useRef(0);
  const alienMaxCdRef = useRef(3600);
  const sabHpRef = useRef(80);
  const invincibleRef = useRef(0);
  const sabInvincibleRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const enemiesPerWaveRef = useRef(0);
  const waveEnemiesKilledRef = useRef(0);
  const waveTargetRef = useRef(10);
  const bossActiveRef = useRef(false);
  const rainTimerRef = useRef(0);
  const stinkPowerRef = useRef(5);
  const playerSpeedRef = useRef(3.8);
  const sabDmgRef = useRef(12);
  const stinkActiveRef = useRef(false);
  const syncWorld = () => {
    const iw = infiniteWorldRef.current;
    iw.ensureNear(kxRef.current, kyRef.current);
    const biome = iw.getBiomeAt(kxRef.current, kyRef.current);
    worldRef.current = {
      kx: kxRef.current, ky: kyRef.current,
      sabX: sabXRef.current, sabY: sabYRef.current,
      sabHp: sabHpRef.current,
      sabAttacking: sabAttackTimerRef.current > 25,
      sabBiting: sabBitingRef.current,
      isAlien: isAlienRef.current,
      pullupAnim: pullupAnimRef.current,
      stinkActive: stinkActiveRef.current,
      stinkRadius: (82 + statsRef.current.wave * 2) * stinkRadiusMultRef.current,
      enemies: enemiesRef.current,
      boss: bossRef.current,
      projectiles: projRef.current,
      items: itemsRef.current,
      floatingTexts: floatingTextsRef.current,
      isRaining: isRainingRef.current,
      tick: tickRef.current,
      wave: statsRef.current.wave,
      kolyaSkin: kolyaSkinRef.current,
      sabSkin: sabSkinRef.current,
      biomeLabel: BIOME_NAMES[biome] ?? biome,
      isLocalDead: isDeadRef.current,
    };
  };

  const isRainingRef = useRef(false);
  const pullupAnimRef = useRef(false);
  const sabAttackTimerRef = useRef(0);

  useEffect(() => {
    const onResize = () => { setScreenW(window.innerWidth); setScreenH(window.innerHeight); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const canMoveTo = (nx: number, ny: number) =>
    isWalkableWorld(infiniteWorldRef.current, nx, ny);

  const screenToWorld = (mx: number, my: number) => ({
    x: mx + kxRef.current - screenW / 2,
    y: my + kyRef.current - screenH / 2,
  });

  const addFloat = useCallback((x: number, y: number, text: string, color = "#fff") => {
    const stack = floatStackRef.current++;
    floatingTextsRef.current = [
      ...floatingTextsRef.current.slice(-25),
      createFloatingText(x, y, text, color, stack),
    ];
  }, []);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (gameState !== "playing" && gameState !== "paused") return;

      keysRef.current.add(e.code);
      if (e.code === "Escape" || e.code === "KeyP") {
        if (gameState === "playing") setGameState("paused");
        else if (gameState === "paused") setGameState("playing");
      }
      if (e.code === "KeyE" && gameState === "playing" && !e.repeat) {
        alienTriggerRef.current = true;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyE", "KeyF", "KeyQ"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (gameState === "playing" || gameState === "paused") keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const canRefillWater = () => waterRef.current <= WATER_REFILL_BELOW + 0.01;

  const fireWaterShot = (tx: number, ty: number) => {
    const cost = waterPerShotRef.current;
    if (keysRef.current.has("KeyF") && canRefillWater()) return;
    if (waterRef.current + 0.02 < cost) {
      addFloat(kxRef.current, kyRef.current - 40, `Мало воды! F при ≤${WATER_REFILL_BELOW}Л`, "#f88");
      return;
    }
    const dx = tx - kxRef.current, dy = ty - kyRef.current;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 11;
    const mk = () => ({
      id: nextId(), x: kxRef.current, y: kyRef.current,
      vx: (dx / d) * spd, vy: (dy / d) * spd,
      type: "water" as const, owner: "player" as const, dmg: 15 + Math.floor(statsRef.current.wave / 4), life: 100,
    });
    projRef.current = [...projRef.current, mk()];
    if (doubleShotRef.current) {
      const a2 = Math.atan2(dy, dx) + 0.12;
      projRef.current = [...projRef.current, {
        ...mk(), id: nextId(),
        vx: Math.cos(a2) * spd, vy: Math.sin(a2) * spd,
      }];
    }
    waterRef.current = Math.max(0, waterRef.current - cost);
    setWater(waterRef.current);
    playSfx("shoot");
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (gameState !== "playing" || isDeadRef.current) return;
    if (keysRef.current.has("KeyF") && waterRef.current <= WATER_REFILL_BELOW + 0.01) return;
    if (waterRef.current + 0.02 < waterPerShotRef.current) return;
    const world = screenToWorld(e.clientX, e.clientY);
    fireWaterShot(world.x, world.y);
  }, [gameState, screenW, addFloat]);

  type StartOpts = { seed?: number; spawnX?: number; spawnY?: number; memberIdx?: number };

  const startGame = async (opts?: number | StartOpts) => {
    const o: StartOpts = typeof opts === "number" ? { seed: opts } : (opts ?? {});
    isDeadRef.current = false;
    pullupCdRef.current = 0;
    resetIds();
    const newSeed = o.seed ?? Date.now() + Math.floor(Math.random() * 1_000_000);
    infiniteWorldRef.current = new InfiniteWorld(newSeed);
    const up = await storage.getAppliedUpgrades();
    const ab = await storage.getOwnedAbilities();
    abilitiesRef.current = ab;
    const skins = await storage.getEquippedSkins();
    setKolyaSkin(skins.kolya);
    setSabSkin(skins.sab);
    kolyaSkinRef.current = skins.kolya;
    sabSkinRef.current = skins.sab;

    const applied = applyUpgrades({ maxHp: 90, waterCap: 115, speed: 3.8 }, up, ab);
    waterPerShotRef.current = applied.waterPerShot;
    stinkRadiusMultRef.current = applied.stinkRadiusMult;
    doubleShotRef.current = applied.doubleShot;
    sabFuryRef.current = applied.sabFury;
    pullupHealBonusRef.current = applied.pullupHealBonus;
    rainSpeedRef.current = applied.rainSpeed;
    regenStinkRef.current = applied.regenOnStink;

    const sp = infiniteWorldRef.current.getSpawn();
    const cx = sp.x;
    const cy = sp.y;

    kxRef.current = cx; kyRef.current = cy;
    sabXRef.current = cx + 60; sabYRef.current = cy + 40;
    floatingTextsRef.current = [];
    kolyaHpRef.current = applied.maxHp;
    kolyaMaxHpRef.current = applied.maxHp;
    waterRef.current = applied.waterCap;
    waterCapRef.current = applied.waterCap;
    isAlienRef.current = false;
    alienFreezeTimerRef.current = 0;
    alienMaxFreezeRef.current = applied.alienFreezeMax;
    isRainingRef.current = false;
    alienCooldownRef.current = 0;
    alienMaxCdRef.current = applied.alienCd;
    sabHpRef.current = 80;
    invincibleRef.current = 0;
    sabInvincibleRef.current = 0;
    stinkPowerRef.current = applied.stinkDmg;
    playerSpeedRef.current = applied.speed;
    sabDmgRef.current = applied.sabDmg;
    enemiesRef.current = [];
    bossRef.current = null;
    projRef.current = [];
    itemsRef.current = [];
    spawnTimerRef.current = 0;
    enemiesPerWaveRef.current = 0;
    waveEnemiesKilledRef.current = 0;
    waveTargetRef.current = getWaveTarget(1);
    bossActiveRef.current = false;
    rainTimerRef.current = 0;
    tickRef.current = 0;
    statsRef.current = emptyStats();
    setKx(cx); setKy(cy);
    setSabX(cx + 60); setSabY(cy + 40);
    setKolyaHp(applied.maxHp); setKolyaMaxHp(applied.maxHp);
    setWater(applied.waterCap); setWaterCap(applied.waterCap);
    setIsAlien(false); setAlienCooldown(0); setAlienMaxCd(applied.alienCd);
    setAlienMaxFreezeDisp(Math.round(applied.alienFreezeMax / 6) / 10);
    setStinkPower(applied.stinkDmg); setPlayerSpeed(applied.speed); setSabDmg(applied.sabDmg);
    setSabHp(80); setInvincible(0);
    setEnemies([]); setBoss(null);
    setProjectiles([]);
    setItems([]);
    setStats(emptyStats());
    setIsRaining(false); setStinkMsg(""); setPocketMsg(""); setInternetDown(false);
    setBossWarning(false); setWaveAnnounce(""); setXpBar(0); setPullUps(0);
    setWaveModifier(getWaveModifier(1));
    void storage.setPresence(true);
    setGameState("playing");
  };

  const endGame = async () => {
    const coins = coinsForRun(statsRef.current.score, statsRef.current.wave);
    statsRef.current = { ...statsRef.current, coinsEarned: coins };
    await storage.recordGameEnd(statsRef.current.score, statsRef.current.wave, coins);
    const u = await storage.fetchCurrentUser();
    setUser(u);
    setGameState("gameover");
  };

  // ===== GAME LOOP =====
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "paused") {
      cancelAnimationFrame(loopRef.current);
      return;
    }

    let running = true;

    const loop = () => {
      if (!running) return;
      if (gameStateRef.current === "paused") {
        loopRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
      tickRef.current += 1;
      const tk = tickRef.current;
      const st = statsRef.current;
      const W = screenW, H = screenH;
      const SPEED = playerSpeedRef.current;

      // Movement
      let nx = kxRef.current, ny = kyRef.current;
      const keys = keysRef.current;
      if (!isDeadRef.current) {
        let mx = 0, my = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
        if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
        if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
        if (mx !== 0 || my !== 0) {
          const len = Math.sqrt(mx * mx + my * my) || 1;
          const iw = infiniteWorldRef.current;
          iw.ensureNear(kxRef.current, kyRef.current);
          const tileSpd = getTileSpeed(iw.getTile(kxRef.current, kyRef.current));
          const spd = SPEED * tileSpd * (isRaining ? rainSpeedRef.current : 1);
          const tryX = kxRef.current + (mx / len) * spd;
          const tryY = kyRef.current + (my / len) * spd;
          if (canMoveTo(tryX, kyRef.current)) nx = tryX;
          if (canMoveTo(kxRef.current, tryY)) ny = tryY;
        }
        kxRef.current = nx; kyRef.current = ny;
      }

      if (keys.has("KeyF") && !isDeadRef.current && waterRef.current <= WATER_REFILL_BELOW) {
        if (waterRef.current < waterCapRef.current - 0.01) {
          const prev = waterRef.current;
          waterRef.current = Math.min(waterCapRef.current, waterRef.current + 0.45);
          if (prev <= WATER_REFILL_BELOW && waterRef.current > WATER_REFILL_BELOW && tk % 15 === 0) {
            playSfx("refill");
          }
          if (tk % 4 === 0) setWater(waterRef.current);
        }
      }

      if (pullupCdRef.current > 0) pullupCdRef.current -= 1;
      if (keys.has("Space") && pullupCdRef.current <= 0 && !isDeadRef.current && tk % 18 === 0) {
        pullupCdRef.current = 60;
        const newPu = statsRef.current.totalPullUps + 1;
        statsRef.current = { ...statsRef.current, totalPullUps: newPu };
        setPullUps(newPu);
        pullupAnimRef.current = true;
        setTimeout(() => { pullupAnimRef.current = false; }, 300);
        kolyaHpRef.current = Math.min(kolyaMaxHpRef.current, kolyaHpRef.current + 3 + pullupHealBonusRef.current);
        sabHpRef.current = Math.min(80, sabHpRef.current + 2);
        addFloat(kxRef.current, kyRef.current - 50, `ПОДТЯГ #${newPu}!`, "#ffdd00");
      }

      const activateAlienHypno = (chargeTicks: number) => {
        alienFreezeTimerRef.current = chargeTicks;
        alienCooldownRef.current = alienMaxCdRef.current;
        statsRef.current = { ...statsRef.current, alienAbductions: statsRef.current.alienAbductions + 1 };
        const sec = (chargeTicks / 60).toFixed(1);
        addFloat(kxRef.current, kyRef.current - 60, `ГИПНОЗ ${sec}с!`, "#00ff88");
        playSfx("alien");
      };

      if (alienTriggerRef.current && alienCooldownRef.current <= 0 && alienFreezeTimerRef.current <= 0 && !isDeadRef.current) {
        alienTriggerRef.current = false;
        activateAlienHypno(alienMaxFreezeRef.current);
      }

      if (alienFreezeTimerRef.current > 0) {
        alienFreezeTimerRef.current -= 1;
        isAlienRef.current = true;
      } else {
        isAlienRef.current = false;
      }
      if (alienCooldownRef.current > 0) alienCooldownRef.current -= 1;

      stinkActiveRef.current = keys.has("KeyQ");
      if (stinkActiveRef.current && tk % 10 === 0) {
        const sr = (82 + st.wave * 2) * stinkRadiusMultRef.current;
        if (regenStinkRef.current > 0 && tk % 24 === 0) {
          kolyaHpRef.current = Math.min(kolyaMaxHpRef.current, kolyaHpRef.current + regenStinkRef.current);
        }
        const nextEnemies: Enemy[] = [];
        let stinkKills = 0;
        for (const en of enemiesRef.current) {
          if (en.hp <= 0) continue;
          if (dist(en.x, en.y, kxRef.current, kyRef.current) >= sr) {
            nextEnemies.push(en);
            continue;
          }
          const hp = en.hp - stinkPowerRef.current;
          if (hp <= 0) {
            stinkKills += 1;
            const pts = getEnemyPoints(en.type);
            statsRef.current = {
              ...statsRef.current,
              score: statsRef.current.score + pts,
              enemiesKilled: statsRef.current.enemiesKilled + 1,
            };
            waveEnemiesKilledRef.current += 1;
            continue;
          }
          nextEnemies.push({ ...en, hp });
        }
        enemiesRef.current = nextEnemies;
        if (stinkKills > 0 && tk % 24 === 0) {
          addFloat(kxRef.current, kyRef.current - 45, `ВОНЬ ×${stinkKills}`, "#aaff44");
        }
        if (bossRef.current && dist(bossRef.current.x, bossRef.current.y, kxRef.current, kyRef.current) < sr + 50) {
          bossRef.current = { ...bossRef.current, hp: bossRef.current.hp - Math.floor(stinkPowerRef.current * 0.45) };
        }
      }

      // Собак Семечкин — помощник: следует за Колей, иногда кусает (без стрельбы)
      const SAB_FOLLOW_DIST = 140;
      const SAB_TELEPORT_DIST = 580;
      const SAB_BITE_RANGE = 42;
      const biteDmgBase = 5 + Math.floor(sabDmgRef.current * 0.25) + (sabFuryRef.current ? 2 : 0);

      sabBitingRef.current = false;
      const dToKolya = dist(sabXRef.current, sabYRef.current, kxRef.current, kyRef.current);

      if (sabHpRef.current > 0 && dToKolya > SAB_TELEPORT_DIST) {
        sabXRef.current = kxRef.current + 55;
        sabYRef.current = kyRef.current + 35;
        addFloat(sabXRef.current, sabYRef.current - 30, "Семечкин: ГАВ!", "#fb3");
      } else if (sabHpRef.current > 0 && dToKolya > SAB_FOLLOW_DIST) {
        const sdx = kxRef.current - sabXRef.current, sdy = kyRef.current - sabYRef.current;
        const sl = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        const nsx = sabXRef.current + (sdx / sl) * 3.4;
        const nsy = sabYRef.current + (sdy / sl) * 3.4;
        if (canMoveTo(nsx, nsy)) { sabXRef.current = nsx; sabYRef.current = nsy; }
      }

      let biteTarget: Enemy | null = null;
      let biteDist = 999999;
      for (const en of enemiesRef.current) {
        if (en.hp <= 0) continue;
        const d = dist(sabXRef.current, sabYRef.current, en.x, en.y);
        if (d < 90 && d < biteDist) { biteDist = d; biteTarget = en; }
      }

      if (biteTarget && sabHpRef.current > 0 && dToKolya < 220) {
        sabBitingRef.current = true;
        const bdx = biteTarget.x - sabXRef.current, bdy = biteTarget.y - sabYRef.current;
        const bl = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
        const nsx = sabXRef.current + (bdx / bl) * 3.6;
        const nsy = sabYRef.current + (bdy / bl) * 3.6;
        if (canMoveTo(nsx, nsy)) { sabXRef.current = nsx; sabYRef.current = nsy; }
        if (biteDist < SAB_BITE_RANGE && sabAttackTimerRef.current <= 0) {
          const idx = enemiesRef.current.findIndex(e => e.id === biteTarget!.id);
          if (idx >= 0) {
            enemiesRef.current[idx] = { ...enemiesRef.current[idx], hp: enemiesRef.current[idx].hp - biteDmgBase };
            addFloat(biteTarget.x, biteTarget.y - 20, `-${biteDmgBase}`, "#fb3");
            playSfx("bite");
            sabAttackTimerRef.current = 50;
            if (enemiesRef.current[idx].hp <= 0) {
              const en = enemiesRef.current[idx];
              statsRef.current = {
                ...statsRef.current,
                score: statsRef.current.score + getEnemyPoints(en.type),
                enemiesKilled: statsRef.current.enemiesKilled + 1,
              };
              waveEnemiesKilledRef.current += 1;
              enemiesRef.current = enemiesRef.current.filter(e => e.id !== en.id);
            }
          }
        }
      }

      if (sabAttackTimerRef.current > 0) sabAttackTimerRef.current -= 1;

      // Враги далеко — подтягиваем к Коле (каждый отдельно, не ждём пока все убегут)
      const CATCHUP_DIST = 740;
      if (!bossActiveRef.current && tk % 55 === 0) {
        let caughtUp = 0;
        enemiesRef.current = enemiesRef.current.map((en, i) => {
          if (en.hp <= 0) return en;
          if (dist(en.x, en.y, kxRef.current, kyRef.current) <= CATCHUP_DIST) return en;
          const pos = findLandPosition(
            infiniteWorldRef.current, kxRef.current, kyRef.current, 280, 460,
          );
          caughtUp += 1;
          const ring = caughtUp;
          const ang = (ring * 1.7 + en.id * 0.4) % (Math.PI * 2);
          const r = 70 + (ring % 4) * 38;
          return {
            ...en,
            x: pos.x + Math.cos(ang) * r,
            y: pos.y + Math.sin(ang) * r,
            attackTimer: 0,
            stun: 0,
          };
        });
        if (caughtUp > 0 && tk % 40 === 0) {
          addFloat(kxRef.current, kyRef.current - 55, `Враги догнали (${caughtUp})`, "#fd0");
        }
        const alive = enemiesRef.current.filter(en => en.hp > 0);
        if (
          waveEnemiesKilledRef.current < waveTargetRef.current &&
          alive.length === 0 &&
          enemiesPerWaveRef.current < waveTargetRef.current &&
          tk % 90 === 0
        ) {
          enemiesPerWaveRef.current += 1;
          enemiesRef.current = [...enemiesRef.current, spawnEnemy(st.wave, kxRef.current, kyRef.current, infiniteWorldRef.current)];
        }
      }

      if (tk % 720 === 0) {
        const ev = randOf(WORLD_EVENTS);
        addFloat(kxRef.current, kyRef.current - 70, ev, "#fd6");
        statsRef.current = { ...statsRef.current, score: statsRef.current.score + 18 };
        if (ev.includes("лут") || ev.includes("куст")) {
          itemsRef.current = [...itemsRef.current, spawnItem(kxRef.current + rand(-80, 80), kyRef.current + rand(-80, 80))];
        }
        if (ev.includes("замедли")) {
          enemiesRef.current = enemiesRef.current.map(en => ({ ...en, speed: en.speed * 0.88 }));
        }
      }

      // Spawn
      const doubleSpawn = st.wave % 3 === 0;
      if (!bossActiveRef.current) {
        spawnTimerRef.current += 1;
        const spawnInterval = Math.max(18, 82 - st.wave * 4);
        const spawnCount = doubleSpawn ? 4 : st.wave > 3 ? 3 : 2;
        if (spawnTimerRef.current >= spawnInterval && enemiesPerWaveRef.current < waveTargetRef.current) {
          spawnTimerRef.current = 0;
          for (let i = 0; i < spawnCount; i++) {
            if (enemiesPerWaveRef.current < waveTargetRef.current) {
              enemiesPerWaveRef.current += 1;
              enemiesRef.current = [...enemiesRef.current, spawnEnemy(st.wave, kxRef.current, kyRef.current, infiniteWorldRef.current)];
            }
          }
        }
      }

      // Wave transition
      if (!bossActiveRef.current && waveEnemiesKilledRef.current >= waveTargetRef.current && enemiesRef.current.length === 0) {
        const nextWave = st.wave + 1;
        statsRef.current = { ...statsRef.current, wave: nextWave, level: Math.floor(nextWave / 3) + 1 };
        waveTargetRef.current = getWaveTarget(nextWave);
        waveEnemiesKilledRef.current = 0;
        enemiesPerWaveRef.current = 0;
        setXpBar(0);
        setWaveModifier(getWaveModifier(nextWave));
        setWaveAnnounce(`ВОЛНА ${nextWave}! ${getWaveModifier(nextWave)}`);
        playSfx("wave");
        setTimeout(() => setWaveAnnounce(""), 3000);

        if (isBossWave(nextWave)) {
          bossActiveRef.current = true;
          bossRef.current = spawnBoss(nextWave, kxRef.current, kyRef.current);
          setBoss({ ...bossRef.current });
          setBossWarning(true);
          setTimeout(() => setBossWarning(false), 4000);
        }
      }

      const alienFreeze = alienFreezeTimerRef.current > 0;

      // Enemy movement & attacks
      const speedMult = st.wave % 2 === 0 ? 1.15 : 1;
      enemiesRef.current = enemiesRef.current.filter(en => en.hp > 0).map(en => {
        if (alienFreeze) {
          return { ...en, angle: en.angle + 0.02 };
        }
        if (en.stun > 0) {
          return { ...en, stun: en.stun - 1, angle: en.angle + 0.05 };
        }

        const dx = kxRef.current - en.x, dy = kyRef.current - en.y;
        const dl = Math.sqrt(dx * dx + dy * dy) || 1;
        let vx = (dx / dl) * en.speed * speedMult;
        let vy = (dy / dl) * en.speed * speedMult;

        if (en.type === "wifi_drone" || en.type === "rain_drop") {
          vx += Math.sin(tk * 0.05 + en.phase!) * 2;
          vy += Math.cos(tk * 0.05 + en.phase!) * 1.5;
        }
        if (en.type === "tree_ghost" && tk % 180 === Math.floor(en.id % 180)) {
          const tp = findLandPosition(infiniteWorldRef.current, kxRef.current, kyRef.current, 80, 280);
          return { ...en, x: tp.x, y: tp.y, attackTimer: en.attackTimer };
        }
        if (en.type === "provider_golem" && dl < 120) { vx *= 0.3; vy *= 0.3; }

        let attacked = false;
        const touchD = en.type === "vyaly_step" ? 50 : 42;
        if (dl < touchD && invincibleRef.current <= 0 && en.attackTimer <= 0) {
          const dmgMap: Partial<Record<Enemy["type"], number>> = {
            vyaly_step: 11, router: 9, lag_ball: 6, tree_ghost: 14, wifi_drone: 7,
            cable_snake: 10, lag_ghost: 12, provider_golem: 16, child_swarm: 5, rain_drop: 6, kalyan_spirit: 11,
          };
          const dmg = dmgMap[en.type] ?? 7;
          kolyaHpRef.current = Math.max(0, kolyaHpRef.current - dmg);
          invincibleRef.current = 50;
          playSfx("hit");
          setShakeScreen(true); setTimeout(() => setShakeScreen(false), 250);
          addFloat(kxRef.current, kyRef.current - 30, `-${dmg}`, "#f44");
          attacked = true;
          if (kolyaHpRef.current <= 0) { void endGame(); return en; }
        }

        let newProjs = projRef.current;
        if (en.type === "router" && dl < 400 && tk % 80 === Math.floor(en.id % 80)) {
          const rdx = kxRef.current - en.x, rdy = kyRef.current - en.y;
          const rl = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          newProjs = [...newProjs, { id: nextId(), x: en.x, y: en.y, vx: (rdx / rl) * 6, vy: (rdy / rl) * 6, type: "lag_shot", owner: "enemy", dmg: 10 + Math.floor(st.wave / 3), life: 90 }];
        }
        if (en.type === "wifi_drone" && tk % 100 === Math.floor(en.id % 100)) {
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            newProjs = [...newProjs, { id: nextId(), x: en.x, y: en.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, type: "lag_shot", owner: "enemy", dmg: 8, life: 70 }];
          }
        }
        if (en.type === "cable_snake" && tk % 120 === Math.floor(en.id % 120) && dl < 350) {
          newProjs = [...newProjs, { id: nextId(), x: en.x, y: en.y, vx: (dx / dl) * 7, vy: (dy / dl) * 7, type: "cable", owner: "enemy", dmg: 12, life: 80 }];
        }
        if (en.type === "child_swarm" && tk % 60 === Math.floor(en.id % 60)) {
          newProjs = [...newProjs, { id: nextId(), x: en.x, y: en.y, vx: (dx / dl) * 8, vy: (dy / dl) * 8, type: "lag_shot", owner: "enemy", dmg: 6, life: 60 }];
        }
        projRef.current = newProjs;

        let nex = en.x + vx, ney = en.y + vy;
        if (!canMoveTo(nex, en.y)) nex = en.x;
        if (!canMoveTo(en.x, ney)) ney = en.y;
        if (!canMoveTo(nex, ney)) { nex = en.x; ney = en.y; }
        return {
          ...en, x: nex, y: ney, vx, vy, angle: en.angle + 0.03,
          attackTimer: attacked ? 55 : Math.max(0, en.attackTimer - 1),
        };
      });

      if (invincibleRef.current > 0) invincibleRef.current -= 1;
      if (sabInvincibleRef.current > 0) sabInvincibleRef.current -= 1;

      // Босс слишком далеко — тоже подтягиваем
      if (bossRef.current && bossActiveRef.current && !alienFreeze && tk % 45 === 0) {
        if (dist(bossRef.current.x, bossRef.current.y, kxRef.current, kyRef.current) > 780) {
          const pos = findLandPosition(infiniteWorldRef.current, kxRef.current, kyRef.current, 220, 320);
          bossRef.current = {
            ...bossRef.current,
            x: pos.x + rand(-40, 40),
            y: pos.y - rand(120, 200),
          };
        }
      }

      // Boss logic
      if (bossRef.current && bossActiveRef.current && !alienFreeze) {
        const b = bossRef.current;
        const bPhase = b.hp > b.maxHp * 0.66 ? 1 : b.hp > b.maxHp * 0.33 ? 2 : 3;
        const rage = b.hp < b.maxHp * 0.2;
        bossRef.current.targetX = kxRef.current + rand(-80, 80);
        bossRef.current.targetY = kyRef.current - rand(50, 150);

        const bdx = bossRef.current.targetX - b.x, bdy = bossRef.current.targetY - b.y;
        const bdl = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
        const bSpeed = 2 + bPhase * 0.6 + (rage ? 1.5 : 0);
        const nbx = b.x + (bdx / bdl) * bSpeed;
        const nby = b.y + (bdy / bdl) * bSpeed;

        const atkInt = Math.max(15, 55 - bPhase * 12 - (rage ? 15 : 0));
        if (tk % atkInt === 0) {
          const btx = kxRef.current - nbx, bty = kyRef.current - nby;
          const btl = Math.sqrt(btx * btx + bty * bty) || 1;
          let bossProjs = [...projRef.current, {
            id: nextId(), x: nbx, y: nby,
            vx: (btx / btl) * (6 + bPhase), vy: (bty / btl) * (6 + bPhase),
            type: "boss_ball" as const, owner: "boss" as const, dmg: 14 + bPhase * 6, life: 110,
          }];
          if (bPhase >= 2) {
            for (let a = -0.5; a <= 0.5; a += 0.25) {
              const ang = Math.atan2(bty, btx) + a;
              bossProjs.push({ id: nextId(), x: nbx, y: nby, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, type: "boss_ball", owner: "boss", dmg: 10, life: 90 });
            }
          }
          if (bPhase >= 3 && tk % 25 === 0) {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
              bossProjs.push({ id: nextId(), x: nbx, y: nby, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, type: "boss_laser", owner: "boss", dmg: 9, life: 130 });
            }
          }
          projRef.current = bossProjs;
        }
        if (bPhase >= 2 && tk % 150 === 0) {
          enemiesRef.current = [...enemiesRef.current, spawnEnemy(st.wave, kxRef.current, kyRef.current, infiniteWorldRef.current)];
        }
        bossRef.current = { ...bossRef.current, x: nbx, y: nby, phase: bPhase, rage, angle: bossRef.current.angle + 0.025 };

        if (dist(nbx, nby, kxRef.current, kyRef.current) < 75 && invincibleRef.current <= 0) {
          kolyaHpRef.current = Math.max(0, kolyaHpRef.current - 28);
          invincibleRef.current = 80;
          addFloat(kxRef.current, kyRef.current - 40, "-28 БОСС!", "#f00");
          if (kolyaHpRef.current <= 0) void endGame();
        }
      }

      // Projectiles
      let updatedProjs = projRef.current.map(p => {
        if (alienFreeze && (p.owner === "enemy" || p.owner === "boss")) {
          return { ...p, life: p.life - 1 };
        }
        return { ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 };
      }).filter(p => {
        if (p.life <= 0) return false;
        return dist(p.x, p.y, kxRef.current, kyRef.current) < 1400;
      });

      const killed: number[] = [];
      updatedProjs = updatedProjs.filter(p => {
        if (p.owner !== "player" && p.owner !== "sabchak") return true;
        for (let i = 0; i < enemiesRef.current.length; i++) {
          const en = enemiesRef.current[i];
          const hitR = en.type === "provider_golem" ? 38 : 30;
          if (dist(p.x, p.y, en.x, en.y) < hitR) {
            enemiesRef.current[i] = { ...en, hp: en.hp - p.dmg };
            addFloat(en.x, en.y - 20, `-${p.dmg}`, "#ff4");
            if (enemiesRef.current[i].hp <= 0) {
              killed.push(en.id);
              const pts = getEnemyPoints(en.type);
              statsRef.current = { ...statsRef.current, score: statsRef.current.score + pts, enemiesKilled: statsRef.current.enemiesKilled + 1 };
              waveEnemiesKilledRef.current += 1;
              addFloat(en.x, en.y - 40, `+${pts}`, "#4f8");
              if (Math.random() < 0.28) {
                itemsRef.current = [...itemsRef.current, spawnItem(en.x, en.y)];
              }
            }
            return false;
          }
        }
        if (bossRef.current && bossActiveRef.current && dist(p.x, p.y, bossRef.current.x, bossRef.current.y) < 85) {
          bossRef.current = { ...bossRef.current, hp: bossRef.current.hp - p.dmg };
          addFloat(bossRef.current.x + rand(-20, 20), bossRef.current.y - 40, `-${p.dmg}`, "#f44");
          if (bossRef.current.hp <= 0) {
            bossActiveRef.current = false;
            const bType = bossRef.current.type;
            const bonus = 400 + st.wave * 20;
            statsRef.current = { ...statsRef.current, score: statsRef.current.score + bonus, bossesKilled: statsRef.current.bossesKilled + 1 };
            setBoss(null); bossRef.current = null;
            addFloat(kxRef.current, kyRef.current - 60, `БОСС! +${bonus}`, "#fd0");
            setWaveAnnounce(`${BOSS_NAMES[bType]} УНИЧТОЖЕН!`);
            setTimeout(() => setWaveAnnounce(""), 4000);
            for (let ci = 0; ci < 8; ci++) itemsRef.current = [...itemsRef.current, spawnItem(kxRef.current + rand(-120, 120), kyRef.current + rand(-120, 120))];
            waveEnemiesKilledRef.current = waveTargetRef.current;
          }
          return false;
        }
        return true;
      });

      updatedProjs = updatedProjs.filter(p => {
        if (p.owner !== "enemy" && p.owner !== "boss") return true;
        if (dist(p.x, p.y, kxRef.current, kyRef.current) < 24 && invincibleRef.current <= 0) {
          kolyaHpRef.current = Math.max(0, kolyaHpRef.current - p.dmg);
          invincibleRef.current = 45;
          if (kolyaHpRef.current <= 0) { void endGame(); return false; }
          return false;
        }
        if (sabHpRef.current > 0 && dist(p.x, p.y, sabXRef.current, sabYRef.current) < 20) {
          sabHpRef.current = Math.max(0, sabHpRef.current - Math.floor(p.dmg * 0.5));
          setSabHp(sabHpRef.current);
          return false;
        }
        return true;
      });

      if (killed.length) enemiesRef.current = enemiesRef.current.filter(en => !killed.includes(en.id));
      projRef.current = updatedProjs;

      // Item pickup
      itemsRef.current = itemsRef.current.filter(item => {
        if (dist(item.x, item.y, kxRef.current, kyRef.current) < 45) {
          const r = applyItemEffect(item.type, {
            hp: kolyaHpRef.current, maxHp: kolyaMaxHpRef.current,
            water: waterRef.current, waterCap: waterCapRef.current,
            score: statsRef.current.score, invincible: invincibleRef.current,
          });
          kolyaHpRef.current = r.hp;
          waterRef.current = r.water;
          invincibleRef.current = r.invincible;
          statsRef.current = { ...statsRef.current, score: r.score };
          addFloat(item.x, item.y - 24, ITEM_PICKUP_LABELS[item.type] ?? "+", "#afa");
          playSfx("coin");
          return false;
        }
        return true;
      });

      if (sabHpRef.current > 0 && sabHpRef.current < 80 && tk % 150 === 0) {
        sabHpRef.current = Math.min(80, sabHpRef.current + 4);
      }

      floatingTextsRef.current = floatingTextsRef.current
        .map(ft => ({ ...ft, y: ft.y + ft.vy, life: ft.life - 1 }))
        .filter(ft => ft.life > 0);

      rainTimerRef.current += 1;
      if (rainTimerRef.current >= 800) {
        rainTimerRef.current = 0;
        isRainingRef.current = !isRainingRef.current;
      }

      if (tk > bannerBusyUntilRef.current) {
        const phase = Math.floor(tk / 480) % 3;
        const sub = tk % 480;
        if (phase === 0 && sub === 0) {
          bannerBusyUntilRef.current = tk + 300;
          setInternetDown(true);
          setInternetMsg(randOf(INTERNET_MESSAGES));
          setStinkMsg(""); setPocketMsg("");
          setTimeout(() => setInternetDown(false), 2800);
        } else if (phase === 1 && sub === 0) {
          bannerBusyUntilRef.current = tk + 300;
          setStinkMsg(randOf(STINK_MESSAGES));
          setInternetDown(false); setPocketMsg("");
          setTimeout(() => setStinkMsg(""), 2800);
        } else if (phase === 2 && sub === 0) {
          bannerBusyUntilRef.current = tk + 300;
          setPocketMsg(`В кармане: ${randOf(POCKET_STUFF)}`);
          setInternetDown(false); setStinkMsg("");
          setTimeout(() => setPocketMsg(""), 2800);
        }
      }

      if (tk % 550 === 0) setNickname(randOf(KOLAY_NICKNAMES));
      if (tk % 650 === 0) {
        setSabPhrase(randOf(SABCHAK_PHRASES));
        setTimeout(() => setSabPhrase(""), 3000);
      }

      syncWorld();

      if (tk % 12 === 0) {
        setHudTick(h => h + 1);
        const b = infiniteWorldRef.current.getBiomeAt(kxRef.current, kyRef.current);
        setBiomeLabel(BIOME_NAMES[b] ?? b);
        setKx(kxRef.current);
        setKy(kyRef.current);
        setKolyaHp(kolyaHpRef.current);
        setWater(waterRef.current);
        setAlienCooldown(alienCooldownRef.current);
        setAlienFreezeLeft(alienFreezeTimerRef.current);
        setIsAlien(isAlienRef.current);
        setSabHp(sabHpRef.current);
        setEnemies([...enemiesRef.current]);
        setBoss(bossRef.current ? { ...bossRef.current } : null);
        setProjectiles([...projRef.current]);
        setItems([...itemsRef.current]);
        setStats({ ...statsRef.current });
        setIsRaining(isRainingRef.current);
        setStinkRadius(stinkActiveRef.current);
        setInvincible(invincibleRef.current);
        if (!bossActiveRef.current && waveTargetRef.current > 0) {
          setXpBar(Math.min(100, Math.floor((waveEnemiesKilledRef.current / waveTargetRef.current) * 100)));
        }
      }

      if (projRef.current.length > 280) {
        projRef.current = projRef.current.slice(-220);
      }
      } catch (err) {
        console.error("game loop", err);
      }
      if (running) loopRef.current = requestAnimationFrame(loop);
    };

    loopRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(loopRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, screenW, screenH]);

  if (gameState === "menu") {
    return (
      <MenuScreen
        onStartSolo={() => startGame()}
        user={user}
        serverOnline={storage.isServerMode()}
        onAuthChange={refreshUser}
      />
    );
  }
  if (gameState === "gameover") {
    return (
      <GameOverScreen
        stats={stats}
        onRestart={() => startGame()}
        onMenu={() => setGameState("menu")}
      />
    );
  }

  const hpPct = (kolyaHp / kolyaMaxHp) * 100;
  const sabHpPct = (sabHp / sabMaxHp) * 100;
  const alienReady = alienCooldown <= 0 && alienFreezeLeft <= 0;
  const alienPct = Math.max(0, Math.min(100, ((alienMaxCd - alienCooldown) / alienMaxCd) * 100));

  return (
    <div
      className="game-wrap"
      style={{
        transform: shakeScreen ? `translate(${rand(-5, 5)}px,${rand(-3, 3)}px)` : undefined,
        cursor: "crosshair",
      }}
      onClick={handleClick}
    >
      <GameCanvas
        worldRef={worldRef}
        infiniteWorldRef={infiniteWorldRef}
        viewportW={screenW}
        viewportH={screenH}
        active={gameState === "playing"}
      />

      {boss && <Boss3D boss={boss} cameraX={kx} cameraY={ky} screenW={screenW} screenH={screenH} />}

      <div className="hud-layer">
        <div className="hud-panel" style={{ top: 12, left: 12 }}>
          <div style={{ color: "#fff", fontSize: 12 }}>
            <b style={{ color: "#fd0" }}>КОЛЯ</b>
            <span style={{ color: "#8cf", fontSize: 10 }}> [{kolyaSkin}]</span>
            <span style={{ color: "#888", fontSize: 10 }}> "{nickname}"</span>
          </div>
          <div className="hud-bar" style={{ width: 200 }}><div className="hud-bar-fill" style={{ width: `${hpPct}%`, background: hpPct > 50 ? "#4f4" : hpPct > 25 ? "#fa0" : "#f22" }} /></div>
          <div style={{ color: "#fff", fontSize: 10 }}>HP {kolyaHp}/{kolyaMaxHp}</div>
          <div className="hud-bar" style={{ width: 200, height: 8 }}><div className="hud-bar-fill" style={{ width: `${(water / waterCap) * 100}%`, background: "#48f" }} /></div>
          <div style={{ color: water >= waterPerShotRef.current ? "#8af" : "#f66", fontSize: 10 }}>
            Вода {Math.round(water)}Л/{waterCap}Л {water <= 2 ? "(F — ≤2Л)" : ""}
          </div>
          <div className="hud-bar" style={{ width: 200, height: 6 }}>
            <div
              className="hud-bar-fill"
              style={{
                width: `${alienFreezeLeft > 0 ? 100 : alienPct}%`,
                background: alienFreezeLeft > 0 ? "#0fa" : alienReady ? "#0f8" : "#3a5",
              }}
            />
          </div>
          <div style={{ color: alienReady || alienFreezeLeft > 0 ? "#0f8" : "#5a7", fontSize: 10 }}>
            {alienFreezeLeft > 0
              ? `Гипноз ${(alienFreezeLeft / 60).toFixed(1)}с`
              : alienReady
                ? `E — гипноз ${alienMaxFreezeDisp} сек`
                : `КД ${Math.ceil(alienCooldown / 60)}с`}
          </div>
        </div>

        <div className="hud-panel" style={{ top: 12, left: 240 }}>
          <div style={{ color: "#fff", fontSize: 11 }}><b style={{ color: "#fb3" }}>Собак Семечкин</b></div>
          <div className="hud-bar" style={{ width: 150 }}><div className="hud-bar-fill" style={{ width: `${sabHpPct}%`, background: "#fb3" }} /></div>
          <div style={{ color: "#fff", fontSize: 10 }}>{sabHp}/{sabMaxHp}</div>
        </div>

        <div className="hud-panel" style={{ top: 12, right: 12, textAlign: "right" }}>
          <div style={{ color: "#fd0", fontSize: 20, fontWeight: "bold" }}>{stats.score}</div>
          <div style={{ color: "#afa", fontSize: 12 }}>Волна {stats.wave} {waveModifier && `· ${waveModifier}`}</div>
          <div style={{ color: "#8cf", fontSize: 10 }}>{biomeLabel}</div>
          <div style={{ color: "#888", fontSize: 10 }}>Убито: {stats.enemiesKilled} · Боссов: {stats.bossesKilled}</div>
          <div style={{ color: "#ff8", fontSize: 10 }}>Подтяг: {pullUps}</div>
        </div>

        {boss && (
          <div className="hud-panel" style={{ top: 70, left: "50%", transform: "translateX(-50%)", width: Math.min(480, screenW * 0.55) }}>
            <div style={{ color: "#f44", fontWeight: "bold", fontSize: 13, textAlign: "center", marginBottom: 4 }}>
              {BOSS_NAMES[boss.type]} — Фаза {boss.phase} {boss.rage ? "ЯРОСТЬ" : ""}
            </div>
            <div className="hud-bar" style={{ height: 14 }}><div className="hud-bar-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%`, background: "linear-gradient(90deg,#800,#f44)" }} /></div>
          </div>
        )}

        <div className="hud-panel hud-controls">
          WASD · ЛКМ вода · Q вонь · F заряд (≤{WATER_REFILL_BELOW}Л) · Space подтяг · E гипноз · лут сразу
        </div>

        <Minimap worldRef={worldRef} infiniteWorldRef={infiniteWorldRef} />

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 6, zIndex: 12 }}>
          <div style={{ width: `${xpBar}%`, height: "100%", background: "linear-gradient(90deg,#84f,#f4f)", transition: "width 0.4s" }} />
        </div>
      </div>

      {internetDown && (
        <div className="event-popup">
          <div style={{ fontSize: 18, color: "#f44", fontWeight: "bold" }}>{internetMsg}</div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>ПРОВОДА ПЛАВЯТСЯ</div>
        </div>
      )}
      {stinkMsg && <div className="event-popup stink">{stinkMsg}</div>}
      {sabPhrase && <div className="hud-panel" style={{ bottom: 90, right: 16, color: "#fb3", fontSize: 12 }}>{sabPhrase}</div>}
      {pocketMsg && <div className="event-popup pocket">{pocketMsg}</div>}
      {waveAnnounce && <div className="wave-announce">{waveAnnounce}</div>}
      {bossWarning && boss && (
        <div className="boss-warning">
          <div className="boss-warning-title">БОСС!</div>
          <div style={{ color: "#faa", fontSize: 18 }}>{BOSS_NAMES[boss.type]}</div>
        </div>
      )}

      {gameState === "paused" && (
        <PauseOverlay
          stats={stats}
          onResume={() => setGameState("playing")}
          onQuit={() => setGameState("menu")}
        />
      )}

      <style>{`.float-text { position:fixed; transform:translate(-50%,-50%); font-weight:bold; font-size:13px; z-index:55; pointer-events:none; text-shadow:1px 1px 3px #000; white-space:nowrap; } .game-wrap { position:fixed; inset:0; overflow:hidden; }`}</style>
    </div>
  );
}
