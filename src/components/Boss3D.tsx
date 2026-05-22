import { useRef, useEffect } from "react";
import type { Boss } from "../types";

interface Boss3DProps {
  boss: Boss;
  cameraX: number;
  cameraY: number;
  screenW: number;
  screenH: number;
}

export default function Boss3D({ boss, cameraX, cameraY, screenW, screenH }: Boss3DProps) {
  const screenX = boss.x - cameraX + screenW / 2;
  const screenY = boss.y - cameraY + screenH / 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const t = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      t.current += 0.04;
      const tick = t.current;
      ctx.clearRect(0, 0, 200, 200);

      const cx = 100;
      const cy = 100;
      const rage = boss.rage;

      if (boss.type === "mega_router" || boss.type === "router_omega") {
        drawMegaRouter(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "super_vyaly" || boss.type === "step_mega") {
        drawSuperVyaly(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "alien_king" || boss.type === "alien_emperor") {
        drawAlienKing(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "kalyan_titan" || boss.type === "water_tank") {
        drawKalyanTitan(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "internet_demon" || boss.type === "lag_beast") {
        drawInternetDemon(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "child_king") {
        drawChildKing(ctx, cx, cy, tick, boss.phase, rage);
      } else if (boss.type === "semen_god") {
        drawSemenGod(ctx, cx, cy, tick, boss.phase, rage);
      } else {
        drawAlienKing(ctx, cx, cy, tick, boss.phase, rage);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [boss.type, boss.phase, boss.rage]);

  return (
    <div
      style={{
        position: "fixed",
        left: screenX - 100 * boss.scale,
        top: screenY - 100 * boss.scale,
        width: 200 * boss.scale,
        height: 200 * boss.scale,
        pointerEvents: "none",
        zIndex: 30,
        filter: boss.rage ? "brightness(1.6) saturate(2)" : "none",
        transform: `scale(${boss.scale})`,
        transformOrigin: "top left",
      }}
    >
      <canvas ref={canvasRef} width={200} height={200} style={{ display: "block" }} />
    </div>
  );
}

// ===== МЕГА РОУТЕР =====
function drawMegaRouter(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy);

  // Тень
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.arc(0, 80, 40 + Math.sin(t) * 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  ctx.restore();

  // Тело роутера — 3D коробка
  const bobY = Math.sin(t * 1.5) * 6;
  // rotX unused

  ctx.save();
  ctx.translate(0, bobY);

  // Нижняя грань (темнее)
  ctx.beginPath();
  ctx.moveTo(-45, 20);
  ctx.lineTo(45, 20);
  ctx.lineTo(35, 35);
  ctx.lineTo(-55, 35);
  ctx.closePath();
  ctx.fillStyle = rage ? "#8b0000" : "#1a4a6b";
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff0000" : "#00aaff";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Правая грань
  ctx.beginPath();
  ctx.moveTo(45, -20);
  ctx.lineTo(45, 20);
  ctx.lineTo(35, 35);
  ctx.lineTo(35, -5);
  ctx.closePath();
  ctx.fillStyle = rage ? "#5a0000" : "#0d3050";
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff4400" : "#0088cc";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Передняя грань (главная)
  const grad = ctx.createLinearGradient(-45, -20, -45, 20);
  grad.addColorStop(0, rage ? "#cc2200" : "#1e6fa8");
  grad.addColorStop(0.5, rage ? "#aa0000" : "#155d94");
  grad.addColorStop(1, rage ? "#880000" : "#0d4870");
  ctx.beginPath();
  ctx.moveTo(-45, -20);
  ctx.lineTo(45, -20);
  ctx.lineTo(45, 20);
  ctx.lineTo(-45, 20);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff6600" : "#00d4ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Верхняя грань
  ctx.beginPath();
  ctx.moveTo(-45, -20);
  ctx.lineTo(45, -20);
  ctx.lineTo(35, -35);
  ctx.lineTo(-55, -35);
  ctx.closePath();
  ctx.fillStyle = rage ? "#dd3300" : "#2a7fc0";
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff8800" : "#00eeff";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Мигающие светодиоды
  for (let i = 0; i < 5; i++) {
    const blink = Math.sin(t * (3 + i) + i) > (rage ? -0.5 : 0);
    ctx.beginPath();
    ctx.arc(-30 + i * 15, 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = blink
      ? (i % 2 === 0 ? (rage ? "#ff2200" : "#00ff88") : (rage ? "#ff8800" : "#ffaa00"))
      : "#333";
    ctx.fill();
  }

  // Антенны (3D)
  const antennaWobble = Math.sin(t * 2) * 8;
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * 30, -35);

    // Тень антенны
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(2 + i * 5 + antennaWobble * 0.3, -45);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Антенна
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(i * 5 + antennaWobble, -45);
    ctx.strokeStyle = rage ? "#ff4400" : "#aaddff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Шарик антенны
    const ballGrad = ctx.createRadialGradient(-3, -50, 1, 0, -47, 8);
    ballGrad.addColorStop(0, rage ? "#ff8800" : "#ffffff");
    ballGrad.addColorStop(1, rage ? "#cc2200" : "#0088ff");
    ctx.beginPath();
    ctx.arc(i * 5 + antennaWobble, -47, 7, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.restore();
  }

  // Сигнальные волны
  if (phase >= 2) {
    for (let r = 1; r <= 3; r++) {
      const waveR = ((t * 30 * r) % 80) + 20;
      const waveA = Math.max(0, 1 - waveR / 100);
      ctx.beginPath();
      ctx.arc(0, -55, waveR, Math.PI, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rage ? "255,80,0" : "0,200,255"},${waveA})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Лазерный глаз (phase 3)
  if (phase >= 3) {
    const eyeGrad = ctx.createRadialGradient(-3, 0, 0, 0, 0, 12);
    eyeGrad.addColorStop(0, "#ffffff");
    eyeGrad.addColorStop(0.4, rage ? "#ff0000" : "#ff4400");
    eyeGrad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = eyeGrad;
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

// ===== ВЯЛЫЙ СТЕП СУПЕР =====
function drawSuperVyaly(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy);

  const bob = Math.sin(t * 1.2) * 8;
  const lean = Math.sin(t * 0.6) * 0.15;

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(lean);

  // Тень
  ctx.save();
  ctx.translate(5, 65);
  ctx.scale(1, 0.25);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.restore();

  // ТЕЛО — как 3D цилиндр
  // Низ тела
  ctx.save();
  ctx.translate(0, 20);
  ctx.scale(1, 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fillStyle = rage ? "#5a1a00" : "#2d5a1a";
  ctx.fill();
  ctx.restore();

  // Тело прямоугольник-цилиндр
  const bodyGrad = ctx.createLinearGradient(-28, -30, 28, -30);
  bodyGrad.addColorStop(0, rage ? "#8b2200" : "#2d7a2d");
  bodyGrad.addColorStop(0.3, rage ? "#dd4400" : "#50c050");
  bodyGrad.addColorStop(0.7, rage ? "#cc3300" : "#40a040");
  bodyGrad.addColorStop(1, rage ? "#6a1500" : "#1a4a1a");
  ctx.beginPath();
  ctx.moveTo(-28, 20);
  ctx.lineTo(28, 20);
  ctx.lineTo(28, -30);
  ctx.lineTo(-28, -30);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Верх тела
  ctx.save();
  ctx.translate(0, -30);
  ctx.scale(1, 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fillStyle = rage ? "#cc3300" : "#50cc50";
  ctx.fill();
  ctx.restore();

  // ГОЛОВА 3D сфера
  const headGrad = ctx.createRadialGradient(-12, -70, 5, 0, -65, 30);
  headGrad.addColorStop(0, rage ? "#ffaa88" : "#ffddaa");
  headGrad.addColorStop(0.6, rage ? "#cc4422" : "#cc9944");
  headGrad.addColorStop(1, rage ? "#660000" : "#886622");
  ctx.beginPath();
  ctx.arc(0, -65, 30, 0, Math.PI * 2);
  ctx.fillStyle = headGrad;
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff6600" : "#aa7700";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Глаза
  const eyeOffX = Math.sin(t * 0.8) * 2;
  [-10, 10].forEach((ex, i) => {
    // Белок
    ctx.beginPath();
    ctx.arc(ex, -68, 8, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    // Зрачок
    ctx.beginPath();
    ctx.arc(ex + eyeOffX + (i === 0 ? -1 : 1), -68, 5, 0, Math.PI * 2);
    ctx.fillStyle = rage ? "#cc0000" : "#2244aa";
    ctx.fill();
    // Блик
    ctx.beginPath();
    ctx.arc(ex + eyeOffX - 2, -70, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
  });

  // Рот — злобный
  ctx.beginPath();
  if (rage) {
    ctx.moveTo(-14, -55);
    ctx.lineTo(-8, -60);
    ctx.lineTo(-2, -57);
    ctx.lineTo(4, -61);
    ctx.lineTo(10, -56);
    ctx.lineTo(14, -55);
  } else {
    ctx.arc(0, -55, 12, 0, Math.PI, false);
  }
  ctx.strokeStyle = rage ? "#ff4400" : "#884400";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // РУКИ
  for (let s = -1; s <= 1; s += 2) {
    const armAngle = Math.sin(t * 1.5 + (s > 0 ? Math.PI : 0)) * 0.5;
    ctx.save();
    ctx.translate(s * 28, -15);
    ctx.rotate(armAngle + s * 0.4);
    // Верхняя часть руки
    ctx.beginPath();
    ctx.roundRect(-5, 0, 10, 30, 5);
    ctx.fillStyle = rage ? "#cc4422" : "#50aa50";
    ctx.fill();
    // Кисть
    ctx.beginPath();
    ctx.arc(0, 35, 10, 0, Math.PI * 2);
    ctx.fillStyle = rage ? "#ffaa88" : "#ffddaa";
    ctx.fill();
    ctx.restore();
  }

  // НОГИ
  for (let s = -1; s <= 1; s += 2) {
    const legAngle = Math.sin(t * 3 + (s > 0 ? Math.PI : 0)) * 0.3;
    ctx.save();
    ctx.translate(s * 14, 20);
    ctx.rotate(legAngle);
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 35, 5);
    ctx.fillStyle = rage ? "#770000" : "#1a5a1a";
    ctx.fill();
    // Ступня
    ctx.beginPath();
    ctx.ellipse(s * 4, 38, 12, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#222";
    ctx.fill();
    ctx.restore();
  }

  // БИНОКЛЬ (подглядывает)
  if (phase < 3) {
    ctx.save();
    ctx.translate(18, -65);
    ctx.rotate(-0.3);
    // Корпус бинокля 3D
    for (let by = 0; by < 2; by++) {
      const bgr = ctx.createLinearGradient(-5, by * 14, 5, by * 14);
      bgr.addColorStop(0, "#888");
      bgr.addColorStop(0.5, "#ddd");
      bgr.addColorStop(1, "#666");
      ctx.beginPath();
      ctx.roundRect(-6 + by * 13, 0, 12, 22, 3);
      ctx.fillStyle = bgr;
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Линза
      ctx.beginPath();
      ctx.arc(-6 + by * 13 + 6, 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rage ? "255,100,0" : "0,150,255"},0.7)`;
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ДЕРЕВО позади (phase 1)
  if (phase === 1) {
    ctx.save();
    ctx.translate(-50, 10);
    ctx.scale(0.6, 0.6);
    // Ствол
    const trunkGrad = ctx.createLinearGradient(0, 0, 10, 0);
    trunkGrad.addColorStop(0, "#6b3a1f");
    trunkGrad.addColorStop(1, "#3a1f0a");
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(-5, 0, 14, 60);
    // Крона
    [0, -20, -38].forEach((ty, i) => {
      const treeGrad = ctx.createRadialGradient(0, ty, 5, 0, ty, 28 - i * 5);
      treeGrad.addColorStop(0, "#4caf50");
      treeGrad.addColorStop(1, "#1b5e20");
      ctx.beginPath();
      ctx.arc(0, ty, 28 - i * 5, 0, Math.PI * 2);
      ctx.fillStyle = treeGrad;
      ctx.fill();
    });
    ctx.restore();
  }

  // ЯРОСТЬ ЭФФЕКТ
  if (rage) {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + t;
      const r = 70 + Math.sin(t * 3 + i) * 10;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, -20 + Math.sin(ang) * r * 0.5, 6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${i * 45},100%,60%,0.7)`;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

// ===== КОРОЛЬ ИНОПЛАНЕТЯН =====
function drawAlienKing(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy);

  const float = Math.sin(t * 0.8) * 10;
  const wobble = Math.cos(t * 1.2) * 5;

  ctx.save();
  ctx.translate(wobble * 0.3, float);

  // Тень плавающая
  ctx.save();
  ctx.translate(0, 75 - float * 0.5);
  ctx.scale(1 - float * 0.005, 0.2 + float * 0.002);
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.2 + float * 0.002})`;
  ctx.fill();
  ctx.restore();

  // ТАРЕЛКА (НЛО тело)
  // Снизу
  const saucerGrad = ctx.createLinearGradient(-60, 10, 60, 40);
  saucerGrad.addColorStop(0, rage ? "#550044" : "#334466");
  saucerGrad.addColorStop(0.5, rage ? "#880066" : "#556688");
  saucerGrad.addColorStop(1, rage ? "#220022" : "#223344");
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.beginPath();
  ctx.arc(0, 80, 60, 0, Math.PI * 2);
  ctx.fillStyle = saucerGrad;
  ctx.fill();
  ctx.restore();

  // Основа тарелки
  const diskGrad = ctx.createLinearGradient(-65, 5, 65, 5);
  diskGrad.addColorStop(0, rage ? "#880044" : "#3a5a88");
  diskGrad.addColorStop(0.3, rage ? "#cc0066" : "#6688bb");
  diskGrad.addColorStop(0.7, rage ? "#aa0055" : "#5577aa");
  diskGrad.addColorStop(1, rage ? "#660033" : "#223355");
  ctx.save();
  ctx.scale(1, 0.35);
  ctx.beginPath();
  ctx.arc(0, 30, 65, 0, Math.PI * 2);
  ctx.fillStyle = diskGrad;
  ctx.fill();
  ctx.strokeStyle = rage ? "#ff00aa" : "#88aaff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Огни тарелки
  const numLights = 8;
  for (let i = 0; i < numLights; i++) {
    const ang = (i / numLights) * Math.PI * 2 + t * 2;
    const lx = Math.cos(ang) * 50;
    const ly = 12 + Math.sin(ang) * 50 * 0.35;
    const blink = Math.sin(t * 4 + i * 0.8) > 0;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = blink
      ? `hsl(${i * 45 + t * 30},100%,70%)`
      : "rgba(255,255,255,0.2)";
    ctx.fill();
  }

  // Купол тарелки
  const domeGrad = ctx.createRadialGradient(-15, -40, 5, 0, -25, 40);
  domeGrad.addColorStop(0, "rgba(255,255,255,0.9)");
  domeGrad.addColorStop(0.3, rage ? "rgba(255,100,200,0.7)" : "rgba(100,200,255,0.7)");
  domeGrad.addColorStop(1, rage ? "rgba(180,0,100,0.4)" : "rgba(0,80,160,0.4)");
  ctx.beginPath();
  ctx.ellipse(0, 5, 40, 35, 0, Math.PI, 0);
  ctx.fillStyle = domeGrad;
  ctx.fill();
  ctx.strokeStyle = rage ? "rgba(255,100,200,0.8)" : "rgba(100,220,255,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // ГОЛОВА инопланетянина внутри купола
  const headGrad2 = ctx.createRadialGradient(-8, -30, 3, 0, -25, 22);
  headGrad2.addColorStop(0, rage ? "#ffaacc" : "#aaffaa");
  headGrad2.addColorStop(0.6, rage ? "#cc4488" : "#44cc44");
  headGrad2.addColorStop(1, rage ? "#660033" : "#115511");
  ctx.beginPath();
  ctx.ellipse(0, -22, 22, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = headGrad2;
  ctx.fill();

  // Огромные глаза
  [-9, 9].forEach((ex) => {
    // Глаз чёрный
    ctx.beginPath();
    ctx.ellipse(ex, -26, 9, 13, ex < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    // Блик
    const glowGrad = ctx.createRadialGradient(ex - 2, -30, 0, ex, -26, 9);
    glowGrad.addColorStop(0, rage ? "rgba(255,0,100,0.8)" : "rgba(0,255,200,0.8)");
    glowGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.ellipse(ex, -26, 9, 13, ex < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
  });

  // Маленький рот
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI, rage);
  ctx.strokeStyle = rage ? "#ff4488" : "#44ff88";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Корона (phase 2+)
  if (phase >= 2) {
    ctx.save();
    ctx.translate(0, -48);
    const crownPoints = 5;
    for (let i = 0; i < crownPoints; i++) {
      const a = ((i / crownPoints) * Math.PI * 2) - Math.PI / 2;
      const a2 = (((i + 0.5) / crownPoints) * Math.PI * 2) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a + 0.3) * 25, Math.sin(a + 0.3) * 8 - 18);
      ctx.lineTo(Math.cos(a2) * 22, Math.sin(a2) * 8);
      ctx.closePath();
      const crownGrad = ctx.createLinearGradient(0, -20, 0, 0);
      crownGrad.addColorStop(0, rage ? "#ff4400" : "#ffdd00");
      crownGrad.addColorStop(1, rage ? "#aa0000" : "#ff8800");
      ctx.fillStyle = crownGrad;
      ctx.fill();
      ctx.strokeStyle = rage ? "#ff8800" : "#ffee88";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ЛУЧ ЗАХВАТА (phase 3)
  if (phase >= 3) {
    const beamGrad = ctx.createLinearGradient(0, 15, 0, 100);
    beamGrad.addColorStop(0, rage ? "rgba(255,0,100,0.8)" : "rgba(0,255,150,0.8)");
    beamGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(-25, 15);
    ctx.lineTo(25, 15);
    ctx.lineTo(50, 100);
    ctx.lineTo(-50, 100);
    ctx.closePath();
    ctx.fillStyle = beamGrad;
    ctx.fill();
  }

  // ЩУПАЛЬЦА
  for (let i = 0; i < (phase >= 2 ? 6 : 3); i++) {
    const baseAng = (i / (phase >= 2 ? 6 : 3)) * Math.PI * 2;
    const tenLen = 40 + Math.sin(t * 2 + i) * 10;
    const tenAng = baseAng + Math.sin(t + i * 1.2) * 0.4;
    ctx.save();
    ctx.translate(Math.cos(baseAng) * 35 * 0.6, 12 + Math.sin(baseAng) * 35 * 0.35);
    ctx.rotate(tenAng);
    for (let seg = 0; seg < 5; seg++) {
      const segFrac = seg / 5;
      ctx.save();
      ctx.rotate(Math.sin(t * 2 + seg * 0.5 + i) * 0.3);
      ctx.translate(0, tenLen / 5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4 * (1 - segFrac), tenLen / 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${rage ? 320 : 140},70%,${40 + segFrac * 20}%,0.9)`;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function drawKalyanTitan(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t) * 5);
  ctx.fillStyle = rage ? "#a50" : "#630";
  ctx.fillRect(-15, 10, 30, 50);
  ctx.fillStyle = rage ? "#f80" : "#a60";
  ctx.beginPath();
  ctx.ellipse(0, -20, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  if (phase >= 2) {
    ctx.strokeStyle = `rgba(255,150,0,${0.5 + Math.sin(t * 2) * 0.3})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -30, 40 + Math.sin(t) * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawInternetDemon(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
  g.addColorStop(0, rage ? "#f04" : "#408");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 50 + Math.sin(t * 2) * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f44";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("404", 0, 5);
  if (phase >= 3) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t;
      ctx.fillStyle = "#f80";
      ctx.fillRect(Math.cos(a) * 45 - 3, Math.sin(a) * 45 - 3, 6, 6);
    }
  }
  ctx.restore();
}

function drawChildKing(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < (phase >= 2 ? 5 : 3); i++) {
    const a = (i / 5) * Math.PI * 2 + t;
    ctx.fillStyle = rage ? "#f84" : "#fc8";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 30, Math.sin(a) * 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 30 - 3, Math.sin(a) * 20 - 2, 3, 0, Math.PI * 2);
    ctx.arc(Math.cos(a) * 30 + 3, Math.sin(a) * 20 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSemenGod(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number, rage: boolean) {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 1.5) * 6);
  const fg = ctx.createLinearGradient(-30, 0, 30, 0);
  fg.addColorStop(0, "#8a5a00");
  fg.addColorStop(1, "#daa520");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(0, 5, 35, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, -8, 14, 0, Math.PI * 2);
  ctx.fill();
  if (phase >= 2) {
    ctx.fillStyle = "#eee";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 50, Math.sin(a) * 30, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
