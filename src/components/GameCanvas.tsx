import { useRef, useEffect } from "react";
import type { MutableRefObject } from "react";
import type { InfiniteWorld } from "../infiniteWorld";
import type { WorldSnapshot } from "../worldRef";
import {
  drawTile, drawKolya, drawSabchak, drawEnemy, drawProjectile,
  drawItem, drawStinkAura, drawBossSimple, drawFloatingTexts, skyColorsForBiome,
  drawOnlinePlayer,
} from "../sprites";

interface GameCanvasProps {
  worldRef: MutableRefObject<WorldSnapshot>;
  infiniteWorldRef: MutableRefObject<InfiniteWorld>;
  viewportW: number;
  viewportH: number;
  active: boolean;
}

export default function GameCanvas({
  worldRef, infiniteWorldRef, viewportW, viewportH, active,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = viewportW * dpr;
      canvas.height = viewportH * dpr;
      canvas.style.width = `${viewportW}px`;
      canvas.style.height = `${viewportH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = () => {
      const w = worldRef.current;
      const iw = infiniteWorldRef.current;
      const vw = viewportW;
      const vh = viewportH;
      const cameraX = w.kx;
      const cameraY = w.ky;
      const tick = w.tick;
      const biome = iw.getBiomeAt(cameraX, cameraY);
      const [s0, s1, s2] = skyColorsForBiome(biome, w.isRaining);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
      skyGrad.addColorStop(0, s0);
      skyGrad.addColorStop(0.45, s1);
      skyGrad.addColorStop(1, s2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, vw, vh);

      ctx.save();
      ctx.translate(-cameraX + vw / 2, -cameraY + vh / 2);

      const tiles = iw.tilesInView(cameraX, cameraY, vw, vh);
      for (const t of tiles) {
        drawTile(ctx, t.type, t.x, t.y, tick);
      }

      for (const item of w.items) drawItem(ctx, item, tick);
      for (const en of w.enemies) drawEnemy(ctx, en, tick);
      if (w.boss) drawBossSimple(ctx, w.boss, tick);
      for (const proj of w.projectiles) drawProjectile(ctx, proj);
      if (w.stinkActive) drawStinkAura(ctx, w.kx, w.ky, w.stinkRadius, tick);
      for (const peer of w.onlinePeers) {
        const sk = (peer.skinId as import("../types").KolyaSkinId) ?? "default";
        drawOnlinePlayer(ctx, peer.x, peer.y, tick, peer.username, sk, peer.isDead);
      }
      if (w.sabHp > 0) {
        drawSabchak(ctx, w.sabX, w.sabY, tick, w.sabAttacking, w.sabBiting, w.sabSkin);
      }
      if (!w.isLocalDead) {
        drawKolya(ctx, w.kx, w.ky, tick, w.isAlien, w.pullupAnim, w.kolyaSkin);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawKolya(ctx, w.kx, w.ky, tick, false, false, w.kolyaSkin);
        ctx.restore();
        ctx.font = "bold 12px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#f88";
        ctx.fillText("УПАЛ — жди R от друга", w.kx, w.ky - 70);
      }
      for (const peer of w.onlinePeers) {
        if (peer.isDead) continue;
        const dx = peer.x - w.kx, dy = peer.y - w.ky;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d > 120 && d < 2000) {
          const ax = w.kx + (dx / d) * 90;
          const ay = w.ky + (dy / d) * 90;
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
          ctx.fillStyle = "#6cf";
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(-8, 6);
          ctx.lineTo(8, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      drawFloatingTexts(ctx, w.floatingTexts);

      ctx.restore();

      if (w.isRaining) {
        ctx.strokeStyle = "rgba(120,180,255,0.35)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 60; i++) {
          const rx = ((i * 137 + tick * 3) % vw);
          const ry = ((i * 89 + tick * 8) % (vh + 40)) - 20;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 12);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [active, viewportW, viewportH, worldRef, infiniteWorldRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
    />
  );
}
