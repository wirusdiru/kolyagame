import { useRef, useEffect } from "react";
import type { MutableRefObject } from "react";
import type { TileGrid } from "../mapGenerator";
import { TILE_SIZE, WORLD_H, WORLD_W } from "../mapGenerator";
import type { WorldSnapshot } from "../worldRef";
import {
  drawTile, drawKolya, drawSabchak, drawEnemy, drawProjectile,
  drawItem, drawStinkAura, drawBossSimple, drawFloatingTexts,
} from "../sprites";

interface GameCanvasProps {
  worldRef: MutableRefObject<WorldSnapshot>;
  grid: TileGrid;
  viewportW: number;
  viewportH: number;
  active: boolean;
}

export default function GameCanvas({ worldRef, grid, viewportW, viewportH, active }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

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
      const { viewportW: vw, viewportH: vh } = { viewportW, viewportH };
      const cameraX = w.kx;
      const cameraY = w.ky;
      const tick = w.tick;
      const g = gridRef.current;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
      if (w.isRaining) {
        skyGrad.addColorStop(0, "#0a1020");
        skyGrad.addColorStop(1, "#0d1a2e");
      } else {
        skyGrad.addColorStop(0, "#1a2840");
        skyGrad.addColorStop(0.4, "#2a4030");
        skyGrad.addColorStop(1, "#1a3020");
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, vw, vh);

      ctx.save();
      ctx.translate(-cameraX + vw / 2, -cameraY + vh / 2);

      const tx0 = Math.max(0, Math.floor((cameraX - vw / 2) / TILE_SIZE) - 1);
      const tx1 = Math.min(g[0].length - 1, Math.ceil((cameraX + vw / 2) / TILE_SIZE) + 1);
      const ty0 = Math.max(0, Math.floor((cameraY - vh / 2) / TILE_SIZE) - 1);
      const ty1 = Math.min(g.length - 1, Math.ceil((cameraY + vh / 2) / TILE_SIZE) + 1);

      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          drawTile(ctx, g[ty][tx], tx * TILE_SIZE, ty * TILE_SIZE, tick);
        }
      }

      ctx.strokeStyle = "rgba(80,120,200,0.25)";
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, WORLD_W - 8, WORLD_H - 8);

      for (const item of w.items) drawItem(ctx, item, tick);
      for (const en of w.enemies) drawEnemy(ctx, en, tick);
      if (w.boss) drawBossSimple(ctx, w.boss, tick);
      for (const proj of w.projectiles) drawProjectile(ctx, proj);
      if (w.stinkActive) drawStinkAura(ctx, w.kx, w.ky, w.stinkRadius, tick);
      if (w.sabHp > 0) drawSabchak(ctx, w.sabX, w.sabY, tick, w.sabAttacking);
      drawKolya(ctx, w.kx, w.ky, tick, w.isAlien, w.pullupAnim);
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
  }, [active, viewportW, viewportH, worldRef, grid]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
    />
  );
}
