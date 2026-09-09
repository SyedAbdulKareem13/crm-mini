"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/lib/experience";
import { clamp, rand } from "@/lib/utils";

type Kind = "jasmine" | "gold" | "rose";
interface P {
  kind: Kind;
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vrot: number;
  size: number;
  phase: number;
  alpha: number;
  life: number; // for bursts (1 = permanent)
}

export type PetalsEvent =
  | { type: "burst"; x?: number; y?: number; count?: number; kind?: Kind }
  | { type: "mode"; mode: "drift" | "gather" | "calm" }
  | { type: "density"; value: number };

/** Fire a petals event from any scene: petals({ type: "burst", count: 40 }) */
export function petals(ev: PetalsEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PetalsEvent>("petals", { detail: ev }));
}

const COUNT: Record<string, number> = { high: 44, medium: 24, low: 0 };

/**
 * Global particle language — jasmine petals, gold dust, the occasional rose petal.
 * Reacts to pointer velocity and scroll wind. Scenes can request bursts or a "gather" mode.
 */
export function Petals() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { quality, reducedMotion, pointer, scroll, ready } = useExperience();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reducedMotion || !ready) return;
    const target = COUNT[quality] ?? 0;
    if (target === 0) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    const ps: P[] = [];
    let mode: "drift" | "gather" | "calm" = "drift";
    let density = 1;
    let raf = 0;
    let last = performance.now();
    let running = true;

    const resize = () => {
      dpr = clamp(window.devicePixelRatio || 1, 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (kind: Kind, x?: number, y?: number, burst = false): P => {
      const gold = kind === "gold";
      return {
        kind,
        x: x ?? rand(-40, w + 40),
        y: y ?? (burst ? rand(0, h) : rand(-h * 0.2, -10)),
        vx: burst ? rand(-2.4, 2.4) : rand(-0.15, 0.15),
        vy: burst ? rand(-2.4, 0.5) : gold ? rand(0.05, 0.14) : rand(0.16, 0.4),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-0.012, 0.012),
        size: gold ? rand(1.2, 2.6) : kind === "rose" ? rand(7, 11) : rand(5, 9.5),
        phase: rand(0, Math.PI * 2),
        alpha: gold ? rand(0.35, 0.8) : rand(0.55, 0.9),
        life: 1,
      };
    };

    const seedAll = () => {
      ps.length = 0;
      const n = Math.round(target * density);
      for (let i = 0; i < n; i++) {
        const kind: Kind = i % 3 === 0 ? "gold" : "jasmine";
        const p = spawn(kind);
        p.y = rand(-h * 0.1, h); // pre-distribute
        ps.push(p);
      }
    };

    const drawJasmine = (p: P) => {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha * p.life;
      // petal: pointed ellipse
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.74, -s * 0.5, s * 0.74, s * 0.5, 0, s);
      ctx.bezierCurveTo(-s * 0.74, s * 0.5, -s * 0.74, -s * 0.5, 0, -s);
      const g = ctx.createLinearGradient(0, -s, 0, s);
      if (p.kind === "rose") {
        g.addColorStop(0, "rgba(181,74,96,0.95)");
        g.addColorStop(1, "rgba(122,27,46,0.85)");
      } else {
        g.addColorStop(0, "rgba(255,252,244,0.98)");
        g.addColorStop(1, "rgba(243,228,189,0.9)");
      }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = p.kind === "rose" ? "rgba(90,16,32,0.35)" : "rgba(201,162,74,0.35)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // midrib highlight
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7);
      ctx.lineTo(0, s * 0.7);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
      ctx.restore();
    };

    const drawGold = (p: P, t: number) => {
      const tw = 0.6 + 0.4 * Math.sin(t * 0.003 + p.phase * 4);
      const r = p.size * 3;
      ctx.save();
      ctx.globalAlpha = p.alpha * p.life * tw;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, "rgba(255,240,200,1)");
      g.addColorStop(0.3, "rgba(232,207,138,0.8)");
      g.addColorStop(1, "rgba(201,162,74,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const step = (now: number) => {
      if (!running) return;
      const dt = clamp((now - last) / 16.67, 0.2, 2.5);
      last = now;
      ctx.clearRect(0, 0, w, h);

      const px = pointer.current.x * w, py = pointer.current.y * h;
      const wind = clamp(pointer.current.vx * 40, -1.2, 1.2);
      const gust = clamp(scroll.current.velocity * 0.012, -1.6, 1.6);
      const desired = Math.round(target * density);
      const cx = w / 2, cy = h * 0.5;

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        const gold = p.kind === "gold";
        // sway
        const sway = Math.sin(now * 0.0011 + p.phase) * (gold ? 0.12 : 0.35);
        let ax = sway * 0.02 + wind * 0.02;
        let ay = -gust * 0.02;

        if (mode === "gather") {
          const dx = cx - p.x, dy = cy - p.y;
          const d = Math.hypot(dx, dy) + 1;
          ax += (dx / d) * 0.09;
          ay += (dy / d) * 0.09 - p.vy * 0.03;
        } else if (mode === "calm") {
          ay -= p.vy * 0.01;
        }

        // pointer repulsion
        const dx = p.x - px, dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) + 0.001;
          const f = (1 - d / 140) * 0.9;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }

        p.vx = (p.vx + ax * dt) * 0.985;
        p.vy = (p.vy + ay * dt) * (mode === "gather" ? 0.96 : 0.995);
        if (p.life >= 1 && mode !== "gather") p.vy = Math.max(p.vy, gold ? 0.04 : 0.14);

        p.x += p.vx * dt * 1.15;
        p.y += p.vy * dt * 1.15;
        p.rot += p.vrot * dt + p.vx * 0.004;

        if (p.life < 1) {
          p.life -= 0.006 * dt;
          if (p.life <= 0) { ps.splice(i, 1); continue; }
        }

        // recycle
        if (p.y > h + 30 || p.x < -60 || p.x > w + 60) {
          if (ps.length > desired) { ps.splice(i, 1); continue; }
          Object.assign(p, spawn(p.kind));
          continue;
        }
        if (gold) drawGold(p, now); else drawJasmine(p);
      }
      while (ps.length < desired) ps.push(spawn(ps.length % 3 === 0 ? "gold" : "jasmine"));

      raf = requestAnimationFrame(step);
    };

    const onEvent = (e: Event) => {
      const ev = (e as CustomEvent<PetalsEvent>).detail;
      if (ev.type === "burst") {
        const n = Math.min(ev.count ?? 30, 90);
        for (let i = 0; i < n; i++) {
          const p = spawn(ev.kind ?? (i % 4 === 0 ? "gold" : "jasmine"), (ev.x ?? 0.5) * w + rand(-40, 40), (ev.y ?? 0.5) * h + rand(-30, 30), true);
          p.life = 0.999;
          ps.push(p);
        }
      } else if (ev.type === "mode") {
        mode = ev.mode;
      } else if (ev.type === "density") {
        density = clamp(ev.value, 0, 2);
      }
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    resize();
    seedAll();
    window.addEventListener("resize", resize);
    window.addEventListener("petals", onEvent);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(step);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("petals", onEvent);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [quality, reducedMotion, ready, pointer, scroll]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40" style={{ mixBlendMode: "normal" }} />;
}
