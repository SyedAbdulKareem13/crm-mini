"use client";

/**
 * Manzil One — Hero v2 ("Guide every deal to its destination")
 *
 * A faithful 1:1 React port of the Claude Design prototype
 * (CRM website design exploration / "Manzil One Hero.dc.html"):
 *  - WebGL scene (Three.js): glowing destination beacon, deal cards
 *    auto-traveling a bezier path toward it, a particle stream, and
 *    ambient parallax dust.
 *  - Dot-grid + radial glows + scrims, floating stage chips (parallax).
 *  - A draggable deal card — drag onto the "Closed Won" target to fire
 *    confetti + a beacon shockwave, fly the value into the pipeline
 *    counter, raise a toast, then deal the next card.
 *  - Count-up live stats (fed from the real database), its own
 *    light/dark toggle + coral accent, and the animated LinkedIn credit.
 *  - Runs the full animation on every machine to match the source design 1:1
 *    (intentionally not gated on prefers-reduced-motion). The DOM animations
 *    start immediately; the WebGL layer attaches once three.js loads.
 *
 * Three.js is dynamically imported inside the effect so it ships only
 * to visitors who actually see v2.
 */

import * as React from "react";
import { useTheme } from "next-themes";
import type * as THREE from "three";

type ThreeNS = typeof THREE;

const LINKEDIN_DEFAULT = "https://www.linkedin.com/in/syed-abdul-kareem-b33519200/";
const ACCENT = "#FF5C5C";
const MOTION: "Calm" | "Balanced" | "Showcase" = "Balanced";

type StageKey = "discovery" | "qualified" | "proposal" | "sow" | "won";
type Stage = { name: string; color: string; tint: string; textTint: string };

const STAGES: Record<StageKey, Stage> = {
  discovery: { name: "Discovery", color: "#F5A524", tint: "#FEF3C7", textTint: "#92400E" },
  qualified: { name: "Qualified", color: "#16A34A", tint: "#DCFCE7", textTint: "#15803D" },
  proposal: { name: "Proposal", color: "#06B6D4", tint: "#CFFAFE", textTint: "#0E7490" },
  sow: { name: "SOW Draft", color: "#6366F1", tint: "#E0E7FF", textTint: "#4338CA" },
  won: { name: "Closed Won", color: "#10B981", tint: "#D1FAE5", textTint: "#047857" },
};

type Deal = {
  co: string; sub: string; v: number; p: number; stage: StageKey;
  badge: string; owner: string; ownerName: string; oc: string;
};

const DEALS: Deal[] = [
  { co: "Al Hamra Real Estate", sub: "Staffing · T&M", v: 1.92, p: 80, stage: "sow", badge: "AH", owner: "AM", ownerName: "Aarav Mehta", oc: "#F97316" },
  { co: "Crescent Capital", sub: "Licensing · Retainer", v: 1.25, p: 65, stage: "proposal", badge: "CC", owner: "PN", ownerName: "Priya Nair", oc: "#EC4899" },
  { co: "Skyline Properties", sub: "Consulting · Fixed Bid", v: 2.1, p: 46, stage: "qualified", badge: "SK", owner: "SL", ownerName: "Sara Lin", oc: "#8B5CF6" },
  { co: "Vertex Group", sub: "Staffing · License", v: 0.96, p: 82, stage: "sow", badge: "VX", owner: "TB", ownerName: "Tomás Becker", oc: "#14B8A6" },
  { co: "Horizon Developments", sub: "Advisory · Retainer", v: 1.4, p: 60, stage: "proposal", badge: "HD", owner: "DR", ownerName: "Diego Rivera", oc: "#0EA5E9" },
];

type Card3D = {
  co: string; sub: string; v: string; p: number; stage: string;
  color: string; tint: string; textTint: string; badge: string;
};

const CARDS3D: Card3D[] = [
  { co: "Skyline Properties", sub: "Consulting · Fixed Bid", v: "2.10", p: 46, stage: "Qualified", color: "#16A34A", tint: "#DCFCE7", textTint: "#15803D", badge: "SK" },
  { co: "Crescent Capital", sub: "Licensing · Retainer", v: "1.25", p: 65, stage: "Proposal", color: "#06B6D4", tint: "#CFFAFE", textTint: "#0E7490", badge: "CC" },
  { co: "Vertex Group", sub: "Staffing · License", v: "0.96", p: 82, stage: "SOW Draft", color: "#6366F1", tint: "#E0E7FF", textTint: "#4338CA", badge: "VX" },
  { co: "Atlas Ventures", sub: "Advisory · Retainer", v: "2.40", p: 100, stage: "Closed Won", color: "#10B981", tint: "#D1FAE5", textTint: "#047857", badge: "AV" },
  { co: "Northwind Holdings", sub: "Consulting · T&M", v: "0.54", p: 22, stage: "Discovery", color: "#F5A524", tint: "#FEF3C7", textTint: "#92400E", badge: "NW" },
  { co: "Emerald Estates", sub: "Licensing · Fixed Bid", v: "1.68", p: 55, stage: "Proposal", color: "#06B6D4", tint: "#CFFAFE", textTint: "#0E7490", badge: "EE" },
];

type Theme = "light" | "dark";
type Toast = { title: string; sub: string } | null;
type Counters = { p: number; o: number; w: number };

/** Ensure the prototype's exact font families are available at runtime. */
function ensureFonts() {
  if (typeof document === "undefined") return;
  const id = "mzh-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;600&family=Noto+Nastaliq+Urdu:wght@500;700&display=swap";
  document.head.appendChild(link);
}

/* ------------------------------------------------------------------ *
 * Imperative engine — owns the WebGL scene, parallax, card physics,
 * counters, and the win flow. Talks to React via the callbacks in opts.
 * ------------------------------------------------------------------ */

type EngineRefs = {
  root: HTMLDivElement;
  content: HTMLDivElement | null;
  canvas: HTMLCanvasElement;
  drop: HTMLDivElement;
  card: HTMLDivElement | null;
  confetti: HTMLDivElement;
  pipeline: HTMLSpanElement | null;
  creditWrap: HTMLDivElement | null;
  creditBadge: HTMLSpanElement | null;
  creditGlow: HTMLSpanElement | null;
  creditSheen: HTMLSpanElement | null;
  creditArrow: SVGSVGElement | null;
  creditIcon: SVGSVGElement | null;
};

type EngineOpts = {
  accent: string;
  motion: "Calm" | "Balanced" | "Showcase";
  pipelineCr: number;
  opps: number;
  won: number;
  setCounters: (c: Counters) => void;
  setDeal: (d: Deal) => void;
  setToast: (t: Toast) => void;
};

type CardPhys = {
  x: number; y: number; vx: number; vy: number; scale: number; op: number;
  tiltX: number; tiltY: number; rz: number; mode: "idle" | "drag" | "spring" | "win" | "enter";
  to?: { x: number; y: number }; fired?: boolean;
};

class HeroEngine {
  refs: EngineRefs;
  o: EngineOpts;
  T?: ThreeNS;

  mouse = { x: 0, y: 0 };
  pm = { x: 0, y: 0 };
  card: CardPhys = { x: 0, y: 0, vx: 0, vy: 0, scale: 1, op: 1, tiltX: 0, tiltY: 0, rz: 0, mode: "idle" };
  last = 0;
  disp: Counters = { p: 0, o: 0, w: 0 };
  dealIdx = 0;
  pipelineTrue: number;
  wonTrue: number;
  oppsTrue: number;

  pxEls: NodeListOf<HTMLElement> | [] = [];
  _raf = 0;
  _ro?: ResizeObserver;
  _onMove?: (e: PointerEvent) => void;
  _onResize?: () => void;
  _mv?: (e: PointerEvent) => void;
  _up?: (e: PointerEvent) => void;
  _over = false;
  _ch = false;
  _le = false;
  _pbT = 0;
  scrollY = 0;
  scrollProg = 0;
  _toastT?: ReturnType<typeof setTimeout>;
  drag?: { px: number; py: number; x: number; y: number; lx: number; ly: number; lt: number };

  // three handles
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  rig?: THREE.Group;
  beacon?: { group: THREE.Group; rings: THREE.Mesh[]; core: THREE.Mesh; glow: THREE.Mesh };
  trav: { mesh: THREE.Mesh; shadow: THREE.Mesh; t: number; speed: number; ph: number; lane: THREE.Vector3 }[] = [];
  stream?: { n: number; ts: Float32Array; sp: Float32Array; jx: Float32Array; jy: Float32Array; jz: Float32Array; geo: THREE.BufferGeometry; pts: THREE.Points };
  points?: THREE.Points;
  fx?: { t0: number; wave: THREE.Mesh } | null;
  P0!: THREE.Vector3;
  P1!: THREE.Vector3;
  _scratch!: THREE.Vector3;

  constructor(refs: EngineRefs, opts: EngineOpts) {
    this.refs = refs;
    this.o = opts;
    this.pipelineTrue = opts.pipelineCr;
    this.wonTrue = opts.won;
    this.oppsTrue = opts.opps;
  }

  /** Attach the WebGL layer once three.js has dynamically loaded. The DOM
   *  animations (reveal, parallax, counters, drag, confetti, credit) already
   *  run from mount(), so the hero is never blank even if this is slow/fails. */
  attachThree(T: ThreeNS) {
    this.T = T;
    this.initThree();
  }

  mount() {
    this.last = performance.now();
    const root = this.refs.root;
    this.pxEls = root.querySelectorAll<HTMLElement>("[data-px]");
    this._onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    root.addEventListener("pointermove", this._onMove);

    requestAnimationFrame(() => {
      root.querySelectorAll<HTMLElement>("[data-rise]").forEach((el) =>
        this.revealEl(el, parseFloat(el.getAttribute("data-rise") || "0") || 0)
      );
    });

    this.loadCounts();
    this.animateCredit();

    this._raf = requestAnimationFrame(this.loop);
    // initThree() is called later via attachThree() when three.js finishes loading.
    this._onResize = () => this.onResize();
    window.addEventListener("resize", this._onResize);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    if (this._onMove) this.refs.root.removeEventListener("pointermove", this._onMove);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    if (this._mv) window.removeEventListener("pointermove", this._mv);
    if (this._up) window.removeEventListener("pointerup", this._up);
    if (this._toastT) clearTimeout(this._toastT);
    if (this._ro) this._ro.disconnect();
    if (this.renderer) { try { this.renderer.dispose(); } catch { /* noop */ } }
  }

  revealEl(el: HTMLElement, delay: number) {
    if (!el.animate) return;
    try {
      el.animate(
        [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 720, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
      );
    } catch { /* noop */ }
  }

  animateCredit() {
    const wrap = this.refs.creditWrap, badge = this.refs.creditBadge, glow = this.refs.creditGlow, sheen = this.refs.creditSheen;
    try {
      if (wrap?.animate) wrap.animate([{ opacity: 0, transform: "translateY(28px) scale(.9)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 720, delay: 850, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
      if (badge?.animate) badge.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 2200, iterations: Infinity, easing: "ease-in-out" });
      if (glow?.animate) glow.animate([{ opacity: 0.4, transform: "scale(1)" }, { opacity: 0.72, transform: "scale(1.13)" }, { opacity: 0.4, transform: "scale(1)" }], { duration: 2600, iterations: Infinity, easing: "ease-in-out" });
      if (sheen?.animate) sheen.animate([{ transform: "translateX(-180%) skewX(-12deg)" }, { transform: "translateX(330%) skewX(-12deg)", offset: 0.26 }, { transform: "translateX(330%) skewX(-12deg)" }], { duration: 4200, iterations: Infinity, easing: "cubic-bezier(.6,0,.4,1)" });
    } catch { /* noop */ }
  }

  emitCounters() { this.o.setCounters({ p: this.disp.p, o: this.disp.o, w: this.disp.w }); }

  loadCounts() {
    const t0 = performance.now(), dur = 1300;
    const P = this.pipelineTrue, W = this.wonTrue, O = this.oppsTrue;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      this.disp = { p: P * e, w: W * e, o: O * e };
      this.emitCounters();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  tweenKey(key: keyof Counters, to: number, dur: number) {
    const from = this.disp[key] || 0, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      this.disp = { ...this.disp, [key]: from + (to - from) * e };
      this.emitCounters();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  waitFor<T>(fn: () => T, ms: number): Promise<T> {
    return new Promise((res) => {
      const t0 = Date.now();
      const i = setInterval(() => {
        const v = fn();
        if (v || Date.now() - t0 > ms) { clearInterval(i); res(v); }
      }, 60);
    });
  }

  spring(p: number, v: number, t: number, k: number, d: number, dt: number): [number, number] {
    const a = k * (t - p) - d * v; v = v + a * dt; p = p + v * dt; return [p, v];
  }

  radialTex(r: number, g: number, b: number) {
    const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
    const x = cv.getContext("2d")!;
    const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.45, `rgba(${r},${g},${b},0.45)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return new this.T!.CanvasTexture(cv);
  }

  rr(x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number, rad: number) {
    x.beginPath(); x.moveTo(a + rad, b); x.arcTo(a + w, b, a + w, b + h, rad); x.arcTo(a + w, b + h, a, b + h, rad); x.arcTo(a, b + h, a, b, rad); x.arcTo(a, b, a + w, b, rad); x.closePath();
  }

  drawCard(d: Card3D) {
    const W = 460, H = 300, s = 2, pad = 12, r = 22;
    const cv = document.createElement("canvas"); cv.width = W * s; cv.height = H * s;
    const x = cv.getContext("2d")!; x.scale(s, s);
    x.save(); x.shadowColor = "rgba(15,16,20,.22)"; x.shadowBlur = 28; x.shadowOffsetY = 18;
    this.rr(x, pad, pad, W - 2 * pad, H - 2 * pad, r); x.fillStyle = "#FFFFFF"; x.fill(); x.restore();
    this.rr(x, pad, pad, W - 2 * pad, H - 2 * pad, r); x.lineWidth = 1.5; x.strokeStyle = "#E6E6E0"; x.stroke();
    x.fillStyle = d.color; this.rr(x, pad, pad + 24, 6, H - 2 * pad - 48, 3); x.fill();
    x.fillStyle = d.color; this.rr(x, pad + 26, pad + 26, 50, 50, 14); x.fill();
    x.fillStyle = "#fff"; x.font = "600 22px 'DM Sans'"; x.textBaseline = "middle"; x.textAlign = "center"; x.fillText(d.badge, pad + 26 + 25, pad + 26 + 26);
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    x.fillStyle = "#0F1014"; x.font = "600 28px 'DM Sans'"; x.fillText(d.co, pad + 90, pad + 48);
    x.fillStyle = "#7B7F88"; x.font = "400 18px 'DM Sans'"; x.fillText(d.sub, pad + 90, pad + 74);
    x.strokeStyle = "#ECECE7"; x.setLineDash([4, 5]); x.lineWidth = 1.4; x.beginPath(); x.moveTo(pad + 22, H - 120); x.lineTo(W - pad - 22, H - 120); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#A3A7B0"; x.font = "500 12px 'DM Mono'"; x.fillText("DEAL VALUE", pad + 24, H - 96);
    x.fillStyle = "#0F1014"; x.font = "600 31px 'DM Sans'"; x.fillText("₹" + d.v + " Cr", pad + 24, H - 66);
    x.font = "700 14px 'DM Sans'"; const label = d.stage.toUpperCase(); const pw = x.measureText(label).width + 28;
    x.fillStyle = d.tint; this.rr(x, W - pad - 24 - pw, H - 96, pw, 28, 14); x.fill();
    x.fillStyle = d.textTint; x.textBaseline = "middle"; x.fillText(label, W - pad - 24 - pw + 14, H - 96 + 15); x.textBaseline = "alphabetic";
    x.fillStyle = "#F0F0EB"; this.rr(x, pad + 24, H - 42, W - 2 * pad - 48, 8, 4); x.fill();
    x.fillStyle = d.color; this.rr(x, pad + 24, H - 42, (W - 2 * pad - 48) * d.p / 100, 8, 4); x.fill();
    return cv;
  }

  bezierAt(t: number, out: THREE.Vector3) {
    const u = 1 - t, B = this.beacon!.group.position;
    out.set(0, 0, 0);
    out.addScaledVector(this.P0, u * u);
    out.addScaledVector(this.P1, 2 * u * t);
    out.addScaledVector(B, t * t);
    return out;
  }

  async initThree() {
    if (!this.T) return;
    const T = this.T;
    const canvas = this.refs.canvas, wrap = this.refs.root;
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* noop */ }
    const w = wrap.clientWidth || 1200, h = wrap.clientHeight || 700;
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(42, w / h, 0.1, 100); camera.position.set(0, 0, 9);
    const rig = new T.Group(); scene.add(rig);
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.rig = rig;
    const acc = this.o.accent;
    const glowTex = this.radialTex(255, 255, 255), shadowTex = this.radialTex(0, 0, 0);
    this._scratch = new T.Vector3();
    this.P0 = new T.Vector3(-2.9, -0.9, -0.5);
    this.P1 = new T.Vector3(0.7, 1.2, -1.5);

    const m = this.o.motion;

    // Destination beacon
    const bg = new T.Group();
    const r1 = new T.Mesh(new T.TorusGeometry(0.62, 0.012, 16, 90), new T.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.9 }));
    const r2 = new T.Mesh(new T.TorusGeometry(0.92, 0.01, 16, 90), new T.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.5 }));
    const r3 = new T.Mesh(new T.TorusGeometry(1.24, 0.008, 16, 90), new T.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.28 }));
    const core = new T.Mesh(new T.SphereGeometry(0.12, 24, 24), new T.MeshBasicMaterial({ color: acc }));
    const glow = new T.Mesh(new T.PlaneGeometry(2.8, 2.8), new T.MeshBasicMaterial({ map: glowTex, color: acc, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
    bg.add(r3, r2, r1, glow, core); scene.add(bg);
    this.beacon = { group: bg, rings: [r1, r2, r3], core, glow };
    this.placeBeacon();

    // Auto-traveling deal cards
    this.trav = [];
    const travCount = m === "Calm" ? 3 : m === "Showcase" ? 6 : 4;
    for (let i = 0; i < travCount; i++) {
      const d = CARDS3D[i % CARDS3D.length];
      const tex = new T.CanvasTexture(this.drawCard(d));
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
      const cw = 1.8, ch = cw * (300 / 460);
      const mesh = new T.Mesh(new T.PlaneGeometry(cw, ch), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
      const shadow = new T.Mesh(new T.PlaneGeometry(cw * 1.3, ch * 1.3), new T.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
      scene.add(shadow); scene.add(mesh);
      this.trav.push({ mesh, shadow, t: i / travCount, speed: 0.052, ph: i * 1.7, lane: new T.Vector3((i - (travCount - 1) / 2) * 0.18, (i - (travCount - 1) / 2) * 0.46, -0.3 * (i % 3)) });
    }

    // Particle stream
    const sn = m === "Calm" ? 40 : m === "Showcase" ? 120 : 72;
    const stream = { n: sn, ts: new Float32Array(sn), sp: new Float32Array(sn), jx: new Float32Array(sn), jy: new Float32Array(sn), jz: new Float32Array(sn) } as HeroEngine["stream"] & object;
    const spos = new Float32Array(sn * 3);
    for (let i = 0; i < sn; i++) { stream.ts[i] = Math.random(); stream.sp[i] = 0.1 + Math.random() * 0.14; stream.jx[i] = (Math.random() - 0.5) * 0.55; stream.jy[i] = (Math.random() - 0.5) * 0.55; stream.jz[i] = (Math.random() - 0.5) * 0.55; }
    const sgeo = new T.BufferGeometry(); sgeo.setAttribute("position", new T.BufferAttribute(spos, 3));
    stream.geo = sgeo;
    stream.pts = new T.Points(sgeo, new T.PointsMaterial({ color: acc, size: 0.07, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
    scene.add(stream.pts);
    this.stream = stream;

    // Ambient dust
    const n = m === "Calm" ? 110 : m === "Showcase" ? 320 : 200;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c1 = new T.Color(acc), c2 = new T.Color(0xffffff);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = (Math.random() - 0.5) * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      const c = Math.random() < 0.5 ? c1 : c2; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.BufferAttribute(pos, 3));
    pg.setAttribute("color", new T.BufferAttribute(col, 3));
    this.points = new T.Points(pg, new T.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
    rig.add(this.points);

    this.renderOnce();
    setTimeout(() => { this.placeBeacon(); this.renderOnce(); }, 350);
    setTimeout(() => { this.placeBeacon(); this.renderOnce(); }, 1000);
    this._ro = new ResizeObserver(() => this.onResize());
    this._ro.observe(wrap);
  }

  placeBeacon() {
    if (!this.beacon || !this.camera || !this.T) return;
    const cr = this.refs.canvas.getBoundingClientRect();
    const dr = this.refs.drop.getBoundingClientRect();
    const cx = dr.left + dr.width / 2 - cr.left, cy = dr.top + dr.height / 2 - cr.top;
    const ndcX = (cx / cr.width) * 2 - 1, ndcY = -(cy / cr.height) * 2 + 1;
    const v = new this.T.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const dist = (0 - this.camera.position.z) / dir.z;
    const p = this.camera.position.clone().add(dir.multiplyScalar(dist));
    this.beacon.group.position.copy(p);
  }

  onResize() {
    const wrap = this.refs.root;
    if (!this.renderer || !this.camera) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.placeBeacon();
    this.renderOnce();
  }

  renderOnce() { if (this.renderer && this.scene && this.camera) { try { this.renderer.render(this.scene, this.camera); } catch { /* noop */ } } }

  loop = (now: number) => {
    try {
      const dt = Math.min(0.033, ((now - this.last) || 16) / 1000); this.last = now;
      this.pm.x += (this.mouse.x - this.pm.x) * 0.07;
      this.pm.y += (this.mouse.y - this.pm.y) * 0.07;

      // ---- Scroll-follow: cinematic parallax as the hero scrolls away ----
      this.scrollY = (typeof window !== "undefined" && (window.scrollY || window.pageYOffset)) || 0;
      const heroH = this.refs.root.clientHeight || 1;
      this.scrollProg = Math.min(1, this.scrollY / heroH); // 0 at top → 1 after one hero of scroll

      // Background/decoration layers drift up at depth-dependent rates.
      this.pxEls.forEach((el) => {
        const d = parseFloat(el.dataset.px || "0.3") || 0.3;
        const sy = this.scrollY * 0.28 * d;
        el.style.transform = "translate3d(" + (this.pm.x * 40 * d).toFixed(2) + "px," + (this.pm.y * 28 * d - sy).toFixed(2) + "px,0)";
      });

      // The hero copy lifts and fades out as you scroll into the page.
      if (this.refs.content) {
        const sp = this.scrollProg;
        this.refs.content.style.transform = "translate3d(0," + (-sp * 140).toFixed(1) + "px,0) scale(" + (1 - sp * 0.05).toFixed(3) + ")";
        this.refs.content.style.opacity = Math.max(0, 1 - sp * 1.25).toFixed(3);
      }

      this.updateCard(dt);
      this.updateThree(now, dt);
    } catch (e) { if (!this._le) { this._le = true; console.warn("mz loop error:", e); } }
    this._raf = requestAnimationFrame(this.loop);
  };

  setDropHover(b: boolean) {
    if (this._over === b) return; this._over = b;
    const el = this.refs.drop;
    el.style.transform = "scale(" + (b ? 1.1 : 1) + ")";
    const core = el.querySelector<HTMLElement>("[data-core]");
    if (core) {
      core.style.background = b ? "var(--primary)" : "var(--primary-tint)";
      core.style.color = b ? "#fff" : "var(--primary)";
      core.style.boxShadow = b ? "0 14px 34px -8px var(--glow)" : "none";
    }
  }

  updateCard(dt: number) {
    const c = this.card, el = this.refs.card; if (!el) return;
    const L = (a: number, b: number, t: number) => a + (b - a) * t;
    const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    if (c.mode === "idle") {
      c.x = L(c.x, this.pm.x * 16, 0.06); c.y = L(c.y, this.pm.y * 12, 0.06);
      c.tiltY = L(c.tiltY, this.mouse.x * 7, 0.08); c.tiltX = L(c.tiltX, -this.mouse.y * 7, 0.08);
      c.rz = L(c.rz, 0, 0.1); c.scale = L(c.scale, this._ch ? 1.035 : 1, 0.1); c.op = L(c.op, 1, 0.1);
    } else if (c.mode === "drag") {
      c.tiltY = L(c.tiltY, cl(this.mouse.x * 7, -9, 9), 0.1); c.tiltX = L(c.tiltX, -this.mouse.y * 7, 0.1);
      c.rz = L(c.rz, cl(c.vx * 0.02, -9, 9), 0.15); c.scale = L(c.scale, 1.06, 0.15);
      const cr = el.getBoundingClientRect(), dr = this.refs.drop.getBoundingClientRect();
      const dist = Math.hypot((cr.left + cr.width / 2) - (dr.left + dr.width / 2), (cr.top + cr.height / 2) - (dr.top + dr.height / 2));
      this.setDropHover(dist < dr.width / 2 + 44);
    } else if (c.mode === "spring") {
      [c.x, c.vx] = this.spring(c.x, c.vx, 0, 140, 17, dt);
      [c.y, c.vy] = this.spring(c.y, c.vy, 0, 140, 17, dt);
      c.rz = L(c.rz, 0, 0.12); c.scale = L(c.scale, 1, 0.12);
      c.tiltX = L(c.tiltX, -this.mouse.y * 7, 0.08); c.tiltY = L(c.tiltY, this.mouse.x * 7, 0.08);
      if (Math.abs(c.x) < 0.5 && Math.abs(c.y) < 0.5 && Math.abs(c.vx) < 3 && Math.abs(c.vy) < 3) { c.x = 0; c.y = 0; c.vx = 0; c.vy = 0; c.mode = "idle"; }
    } else if (c.mode === "win") {
      [c.x, c.vx] = this.spring(c.x, c.vx, c.to!.x, 150, 18, dt);
      [c.y, c.vy] = this.spring(c.y, c.vy, c.to!.y, 150, 18, dt);
      c.scale = L(c.scale, 0.3, 0.14); c.rz = L(c.rz, 14, 0.1);
      const dd = Math.hypot(c.x - c.to!.x, c.y - c.to!.y);
      if (!c.fired && dd < 30) { c.fired = true; this.fireWin(); }
      if (c.fired) { c.op = L(c.op, 0, 0.22); if (c.op < 0.05) this.afterWin(); }
    } else if (c.mode === "enter") {
      [c.x, c.vx] = this.spring(c.x, c.vx, 0, 120, 16, dt);
      [c.y, c.vy] = this.spring(c.y, c.vy, 0, 120, 16, dt);
      c.op = L(c.op, 1, 0.12); c.scale = L(c.scale, 1, 0.12); c.rz = L(c.rz, 0, 0.12);
      if (Math.abs(c.y) < 0.6 && Math.abs(c.vy) < 3) c.mode = "idle";
    }
    el.style.transform = "translate3d(" + c.x.toFixed(2) + "px," + c.y.toFixed(2) + "px,0) perspective(1000px) rotateX(" + c.tiltX.toFixed(2) + "deg) rotateY(" + c.tiltY.toFixed(2) + "deg) rotateZ(" + c.rz.toFixed(2) + "deg) scale(" + c.scale.toFixed(3) + ")";
    el.style.opacity = c.op.toFixed(2);
  }

  updateThree(now: number, dt: number) {
    if (!this.renderer || !this.rig || !this.camera || !this.scene) return;
    const t = now * 0.001;
    this._pbT += 1;
    if (this._pbT % 20 === 0) this.placeBeacon();
    this.rig.rotation.y += ((this.pm.x * 0.3) - this.rig.rotation.y) * 0.05;
    this.rig.rotation.x += ((-this.pm.y * 0.18) - this.rig.rotation.x) * 0.05;
    // Scroll-follow: the ambient field gently rises with scroll for depth.
    this.rig.position.y += (this.scrollProg * 1.1 - this.rig.position.y) * 0.08;

    if (this.beacon) {
      this.beacon.rings.forEach((r, i) => { r.rotation.x += 0.002 * (i + 1); r.rotation.y += 0.003 * (i + 1); });
      const pulse = 1 + Math.sin(t * 1.6) * 0.04; this.beacon.group.scale.setScalar(pulse);
      let baseGlow = 0.55 + Math.sin(t * 1.6) * 0.08;
      if (this.fx) {
        const e = (now - this.fx.t0) / 900;
        if (e >= 1) { this.scene.remove(this.fx.wave); this.fx.wave.geometry.dispose(); (this.fx.wave.material as THREE.Material).dispose(); this.fx = null; }
        else { this.fx.wave.scale.setScalar(0.2 + e * 3); (this.fx.wave.material as THREE.MeshBasicMaterial).opacity = (1 - e) * 0.85; baseGlow += (1 - e) * 0.7; }
      }
      (this.beacon.glow.material as THREE.MeshBasicMaterial).opacity = baseGlow;
    }

    if (this.trav.length && this.beacon) {
      const sc = this._scratch;
      this.trav.forEach((c) => {
        c.t += c.speed * dt; if (c.t >= 1) c.t -= 1;
        this.bezierAt(c.t, sc);
        const bob = Math.sin(t * 1.2 + c.ph) * 0.12;
        c.mesh.position.set(sc.x + c.lane.x, sc.y + c.lane.y + bob, sc.z + c.lane.z);
        let a = 1;
        if (c.t < 0.12) a = c.t / 0.12; else if (c.t > 0.8) a = (1 - c.t) / 0.2;
        a = Math.max(0, Math.min(1, a));
        const s = 0.62 + 0.38 * a;
        (c.mesh.material as THREE.MeshBasicMaterial).opacity = 0.96 * a; c.mesh.scale.setScalar(s); c.mesh.rotation.z = Math.sin(t * 0.5 + c.ph) * 0.04;
        c.shadow.position.set(c.mesh.position.x, c.mesh.position.y - 0.42, c.mesh.position.z - 0.05);
        (c.shadow.material as THREE.MeshBasicMaterial).opacity = 0.13 * a; c.shadow.scale.setScalar(s);
      });
    }

    if (this.stream && this.beacon) {
      const arr = this.stream.geo.attributes.position.array as Float32Array, sc = this._scratch;
      for (let i = 0; i < this.stream.n; i++) {
        this.stream.ts[i] += this.stream.sp[i] * dt; if (this.stream.ts[i] >= 1) this.stream.ts[i] -= 1;
        this.bezierAt(this.stream.ts[i], sc);
        arr[i * 3] = sc.x + this.stream.jx[i]; arr[i * 3 + 1] = sc.y + this.stream.jy[i]; arr[i * 3 + 2] = sc.z + this.stream.jz[i];
      }
      this.stream.geo.attributes.position.needsUpdate = true;
    }

    if (this.points) this.points.rotation.y += 0.0006;
    this.renderer.render(this.scene, this.camera);
  }

  onCardEnter = () => { this._ch = true; };
  onCardLeave = () => { this._ch = false; };

  onCardDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (this.card.mode === "win" || this.card.mode === "enter") return;
    e.preventDefault();
    const el = this.refs.card; if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
    this.card.mode = "drag";
    this.drag = { px: e.clientX, py: e.clientY, x: this.card.x, y: this.card.y, lx: e.clientX, ly: e.clientY, lt: performance.now() };
    el.style.cursor = "grabbing";
    this._mv = (ev: PointerEvent) => this.onCardMove(ev);
    this._up = (ev: PointerEvent) => this.onCardUp(ev);
    window.addEventListener("pointermove", this._mv);
    window.addEventListener("pointerup", this._up);
  };

  onCardMove(e: PointerEvent) {
    if (this.card.mode !== "drag" || !this.drag) return;
    this.card.x = this.drag.x + (e.clientX - this.drag.px);
    this.card.y = this.drag.y + (e.clientY - this.drag.py);
    const now = performance.now(), dt = Math.max(8, now - this.drag.lt) / 1000;
    this.card.vx = (e.clientX - this.drag.lx) / dt;
    this.card.vy = (e.clientY - this.drag.ly) / dt;
    this.drag.lx = e.clientX; this.drag.ly = e.clientY; this.drag.lt = now;
  }

  onCardUp(e: PointerEvent) {
    if (this.card.mode !== "drag") return;
    if (this._mv) window.removeEventListener("pointermove", this._mv);
    if (this._up) window.removeEventListener("pointerup", this._up);
    const el = this.refs.card; if (!el) return; el.style.cursor = "grab";
    try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const cr = el.getBoundingClientRect(), dr = this.refs.drop.getBoundingClientRect();
    const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    const dcx = dr.left + dr.width / 2, dcy = dr.top + dr.height / 2;
    const dist = Math.hypot(cx - dcx, cy - dcy);
    if (dist < dr.width / 2 + 44) {
      this.card.to = { x: this.card.x + (dcx - cx), y: this.card.y + (dcy - cy) };
      this.card.mode = "win"; this.card.fired = false;
    } else {
      this.card.mode = "spring";
    }
    this.setDropHover(false);
  }

  confettiBurst(x: number, y: number, big?: boolean) {
    const layer = this.refs.confetti;
    if (!layer) return;
    const colors = [this.o.accent, "#10B981", "#F5A524", "#6366F1", "#06B6D4", "#FF8A65", "#FFFFFF"];
    const m = this.o.motion;
    let N = m === "Calm" ? 46 : m === "Showcase" ? 150 : 92;
    if (big) N = Math.round(N * 1.3);
    for (let i = 0; i < N; i++) {
      const p = document.createElement("div");
      const ang = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 360;
      const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp - (120 + Math.random() * 180);
      p.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;width:" + (6 + Math.random() * 6) + "px;height:" + (9 + Math.random() * 8) + "px;border-radius:2px;background:" + colors[i % colors.length] + ";pointer-events:none;--dx:" + dx + "px;--dy:" + dy + "px;--rot:" + (Math.random() * 720 - 360) + "deg;--s:" + (0.7 + Math.random() * 0.8) + ";animation:mzh-confetti " + (1.1 + Math.random() * 0.7) + "s cubic-bezier(.16,1,.3,1) forwards;";
      layer.appendChild(p);
      setTimeout(() => p.remove(), 2000);
    }
  }

  triggerBeaconFX() {
    if (!this.beacon || !this.scene || !this.T) return;
    const T = this.T;
    const wave = new T.Mesh(new T.TorusGeometry(0.5, 0.03, 16, 80), new T.MeshBasicMaterial({ color: this.o.accent, transparent: true, opacity: 0.9 }));
    wave.position.copy(this.beacon.group.position);
    this.scene.add(wave);
    this.fx = { t0: performance.now(), wave };
  }

  emitValue(x: number, y: number, v: number) {
    const layer = this.refs.confetti;
    if (!layer) return;
    const chip = document.createElement("div");
    chip.textContent = "+₹" + v.toFixed(2) + " Cr";
    chip.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;z-index:760;transform:translate(-50%,-50%);font:700 14px/1 'DM Sans';color:#fff;background:linear-gradient(180deg,var(--primary),var(--primary-deep));padding:7px 13px;border-radius:999px;box-shadow:0 12px 26px -8px var(--glow), inset 0 0 0 1px rgba(255,255,255,.25);pointer-events:none;white-space:nowrap;";
    layer.appendChild(chip);
    let dx = 0, dy = -120;
    const target = this.refs.pipeline;
    if (target) { const tr = target.getBoundingClientRect(); dx = (tr.left + tr.width / 2) - x; dy = (tr.top + tr.height / 2) - y; }
    const done = () => { chip.remove(); this.pipelineTrue += v; this.tweenKey("p", this.pipelineTrue, 650); this.popPipeline(); };
    if (chip.animate) {
      const a = chip.animate(
        [
          { transform: "translate(-50%,-50%) translate(0,0) scale(1)", opacity: 1, offset: 0 },
          { transform: "translate(-50%,-50%) translate(" + dx * 0.5 + "px," + (dy * 0.5 - 70) + "px) scale(1.08)", opacity: 1, offset: 0.55 },
          { transform: "translate(-50%,-50%) translate(" + dx + "px," + dy + "px) scale(0.6)", opacity: 0.1, offset: 1 },
        ],
        { duration: 900, easing: "cubic-bezier(.5,0,.4,1)", fill: "forwards" }
      );
      if (a.finished?.then) a.finished.then(done).catch(done); else setTimeout(done, 920);
    } else { setTimeout(done, 50); }
  }

  popPipeline() {
    const el = this.refs.pipeline;
    if (el?.animate) { try { el.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 480, easing: "cubic-bezier(.34,1.56,.64,1)" }); } catch { /* noop */ } }
  }

  fireWin() {
    const el = this.refs.card; if (!el) return; const cr = el.getBoundingClientRect();
    const x = cr.left + cr.width / 2, y = cr.top + cr.height / 2;
    this.confettiBurst(x, y, true);
    this.triggerBeaconFX();
    const d = DEALS[this.dealIdx];
    this.emitValue(x, y, d.v);
    this.wonTrue += 1; this.tweenKey("w", this.wonTrue, 650);
    this.o.setToast({ title: "Closed Won 🎉", sub: d.co + " · ₹" + d.v.toFixed(2) + " Cr" });
    if (this._toastT) clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.o.setToast(null), 3200);
    this.setDropHover(false);
  }

  afterWin() {
    const ni = (this.dealIdx + 1) % DEALS.length; this.dealIdx = ni;
    const c = this.card;
    c.mode = "enter"; c.x = 0; c.y = 230; c.op = 0; c.scale = 0.92; c.vx = 0; c.vy = 0; c.rz = 0; c.tiltX = 0; c.tiltY = 0;
    this.o.setDeal(DEALS[ni]);
  }

  onTrial = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    this.confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
  };

  onCreditEnter = () => {
    const ic = this.refs.creditIcon;
    if (ic?.animate) { try { ic.animate([{ transform: "perspective(220px) rotateY(0deg)" }, { transform: "perspective(220px) rotateY(360deg)" }], { duration: 680, easing: "cubic-bezier(.5,0,.3,1)" }); } catch { /* noop */ } }
    const ar = this.refs.creditArrow; if (ar) ar.style.transform = "translate(2px,-2px)";
  };
  onCreditLeave = () => { const ar = this.refs.creditArrow; if (ar) ar.style.transform = "translate(0,0)"; };
}

/* ------------------------------------------------------------------ *
 * Theme tokens (ported from the prototype's rootStyle()).
 * ------------------------------------------------------------------ */
function computeRootStyle(theme: Theme, acc: string): React.CSSProperties {
  const base: Record<string, string> = {
    "--bg": "#FAFAF7", "--bg-2": "#F1F1EA", "--surface": "#FFFFFF", "--surface-2": "#FBFBF9",
    "--ink": "#0F1014", "--ink-2": "#2A2D34", "--muted": "#7B7F88", "--muted-2": "#A3A7B0",
    "--line": "#ECECE7", "--line-2": "#E2E2DC", "--line-3": "#D6D6D0",
    "--primary": acc, "--primary-2": "#FF8A65", "--primary-deep": "#F44848", "--primary-tint": "#FFF1F1",
    "--dot": "rgba(15,16,20,0.05)", "--glass": "rgba(255,255,255,0.72)", "--glass-2": "rgba(255,255,255,0.86)", "--glass-border": "rgba(15,16,20,0.07)",
    "--glow": "rgba(255,92,92,0.16)", "--glow-2": "rgba(255,138,101,0.13)",
    "--shadow-card": "0 1px 2px rgba(15,16,20,.05), 0 10px 24px -14px rgba(15,16,20,.22)",
    "--shadow-pop": "0 24px 60px -20px rgba(15,16,20,.26), 0 8px 20px -12px rgba(15,16,20,.14)",
  };
  const dark: Record<string, string> = {
    "--bg": "#0C0D11", "--bg-2": "#16181F", "--surface": "#15171E", "--surface-2": "#1B1E26",
    "--ink": "#F5F5F2", "--ink-2": "#D5D7DD", "--muted": "#9C9FA8", "--muted-2": "#6C6F77",
    "--line": "rgba(255,255,255,0.09)", "--line-2": "rgba(255,255,255,0.13)", "--line-3": "rgba(255,255,255,0.2)",
    "--primary": acc, "--primary-2": "#FF9472", "--primary-deep": "#FF5C5C", "--primary-tint": "rgba(255,92,92,0.15)",
    "--dot": "rgba(255,255,255,0.06)", "--glass": "rgba(18,20,26,0.6)", "--glass-2": "rgba(22,24,31,0.82)", "--glass-border": "rgba(255,255,255,0.09)",
    "--glow": "rgba(255,92,92,0.32)", "--glow-2": "rgba(255,138,101,0.2)",
    "--shadow-card": "0 2px 6px rgba(0,0,0,.5), 0 22px 50px -22px rgba(0,0,0,.7)",
    "--shadow-pop": "0 30px 70px -24px rgba(0,0,0,.75), 0 10px 24px -12px rgba(0,0,0,.5)",
  };
  const vars = theme === "dark" ? { ...base, ...dark } : base;
  return {
    ...vars,
    // height comes from the .mzh-root class (100dvh with a 100vh fallback) so
    // the mobile address bar does not push the hero past the viewport.
    position: "relative", width: "100%", minHeight: "680px", overflow: "hidden",
    background: "var(--bg)", color: "var(--ink)", fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "background .4s ease",
  } as React.CSSProperties;
}

const HERO_CSS = `
@keyframes mzh-confetti {
  0%   { transform: translate(0,0) rotate(0) scale(var(--s)); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: translate(var(--dx), calc(var(--dy) + 340px)) rotate(var(--rot)) scale(var(--s)); opacity: 0; }
}
.mzh-root{height:100vh;}
@supports (height:100dvh){.mzh-root{height:100dvh;}}
.mzh-link:focus-visible,.mzh-signin:focus-visible,.mzh-primary:focus-visible,.mzh-ghost:focus-visible,.mzh-nav-cta:focus-visible,.mzh-credit:focus-visible,.mzh-toggle:focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:10px}
.mzh-link{transition:color .2s}
.mzh-link:hover{color:var(--ink)}
.mzh-signin{transition:border-color .2s, transform .1s}
.mzh-signin:hover{border-color:var(--line-3)}
.mzh-signin:active{transform:scale(.97)}
.mzh-primary{transition:transform .12s, box-shadow .2s}
.mzh-primary:hover{transform:translateY(-2px)}
.mzh-primary:active{transform:translateY(0) scale(.97)}
.mzh-ghost{transition:border-color .2s, transform .12s}
.mzh-ghost:hover{border-color:var(--line-3);transform:translateY(-2px)}
.mzh-ghost:active{transform:translateY(0) scale(.97)}
.mzh-nav-cta{transition:transform .12s, box-shadow .2s}
.mzh-nav-cta:hover{transform:translateY(-1px)}
.mzh-nav-cta:active{transform:translateY(0) scale(.96)}
.mzh-chip{transition:transform .2s ease, border-color .2s}
.mzh-chip:hover{transform:scale(1.07);border-color:var(--line-3)}
.mzh-credit{transition:transform .24s cubic-bezier(.34,1.56,.64,1), box-shadow .25s, border-color .25s}
.mzh-credit:hover{transform:translateY(-3px) scale(1.03);border-color:var(--primary)}
`;

export function HeroV2({
  pipelineCr,
  opps,
  won,
  linkedinUrl = LINKEDIN_DEFAULT,
}: {
  pipelineCr: number;
  opps: number;
  won: number;
  linkedinUrl?: string;
}) {
  // Drive the GLOBAL theme so dark mode covers the whole page (hero + the
  // sections below) and persists to /login and /signup, not just the hero.
  const { resolvedTheme, setTheme: setGlobalTheme } = useTheme();
  const theme: Theme = resolvedTheme === "dark" ? "dark" : "light";
  const [deal, setDeal] = React.useState<Deal>(DEALS[0]);
  const [counters, setCounters] = React.useState<Counters>({ p: 0, o: 0, w: 0 });
  const [toast, setToast] = React.useState<Toast>(null);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const confettiRef = React.useRef<HTMLDivElement>(null);
  const toastRef = React.useRef<HTMLDivElement>(null);
  const pipelineRef = React.useRef<HTMLSpanElement>(null);
  const creditRef = React.useRef<HTMLAnchorElement>(null);
  const creditWrapRef = React.useRef<HTMLDivElement>(null);
  const creditBadgeRef = React.useRef<HTMLSpanElement>(null);
  const creditGlowRef = React.useRef<HTMLSpanElement>(null);
  const creditSheenRef = React.useRef<HTMLSpanElement>(null);
  const creditArrowRef = React.useRef<SVGSVGElement>(null);
  const creditIconRef = React.useRef<SVGSVGElement>(null);

  const engineRef = React.useRef<HeroEngine | null>(null);

  React.useEffect(() => {
    ensureFonts();
    if (!rootRef.current || !canvasRef.current || !dropRef.current || !confettiRef.current) return;

    // Start the DOM animations (reveal, parallax, counters, drag, confetti,
    // credit) IMMEDIATELY — they don't depend on three.js. The full design
    // animates on every machine; we intentionally do not gate on
    // prefers-reduced-motion here so the hero matches the source design 1:1.
    const engine = new HeroEngine(
      {
        root: rootRef.current,
        content: contentRef.current,
        canvas: canvasRef.current,
        drop: dropRef.current,
        card: cardRef.current,
        confetti: confettiRef.current,
        pipeline: pipelineRef.current,
        creditWrap: creditWrapRef.current,
        creditBadge: creditBadgeRef.current,
        creditGlow: creditGlowRef.current,
        creditSheen: creditSheenRef.current,
        creditArrow: creditArrowRef.current,
        creditIcon: creditIconRef.current,
      },
      { accent: ACCENT, motion: MOTION, pipelineCr, opps, won, setCounters, setDeal, setToast }
    );
    engineRef.current = engine;
    engine.mount();

    // Layer the WebGL scene on top once three.js has loaded (lazy chunk).
    let cancelled = false;
    import("three")
      .then((T) => { if (!cancelled) engine.attachThree(T as unknown as ThreeNS); })
      .catch((e) => { console.warn("three.js failed to load; DOM hero still animates", e); });

    return () => {
      cancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineCr, opps, won]);

  // Toast entrance (decoupled from the engine so the ref exists when it shows).
  React.useEffect(() => {
    if (!toast) return;
    const t = toastRef.current;
    if (t?.animate) {
      try { t.animate([{ opacity: 0, transform: "translate(-50%,18px) scale(.96)" }, { opacity: 1, transform: "translate(-50%,0) scale(1)" }], { duration: 440, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" }); } catch { /* noop */ }
    }
  }, [toast]);

  const st = STAGES[deal.stage];
  const rootStyle = computeRootStyle(theme, ACCENT);
  const knobStyle: React.CSSProperties = {
    position: "absolute", top: "3px", left: "3px", width: "30px", height: "28px", borderRadius: "999px",
    background: "var(--surface)", boxShadow: "var(--shadow-card)", transition: "transform .32s cubic-bezier(.34,1.56,.64,1)",
    transform: theme === "dark" ? "translateX(34px)" : "translateX(0)",
  };

  const eng = () => engineRef.current;

  return (
    <div ref={rootRef} data-screen-label="Manzil One — Hero" className="mzh-root" style={rootStyle}>
      <style>{HERO_CSS}</style>

      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1px)", backgroundSize: "24px 24px", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 180px, #000 calc(100% - 60px), transparent 100%)", maskImage: "linear-gradient(to bottom, transparent 0, #000 180px, #000 calc(100% - 60px), transparent 100%)" }} />

      <div data-px="0.6" style={{ position: "absolute", top: "-160px", right: "-120px", width: "720px", height: "720px", zIndex: 1, pointerEvents: "none", willChange: "transform", background: "radial-gradient(circle at center, var(--glow), transparent 66%)" }} />
      <div data-px="0.35" style={{ position: "absolute", bottom: "-220px", left: "-160px", width: "620px", height: "620px", zIndex: 1, pointerEvents: "none", willChange: "transform", background: "radial-gradient(circle at center, var(--glow-2), transparent 68%)" }} />

      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", background: "linear-gradient(to right, var(--bg) 0%, var(--bg) 24%, color-mix(in oklab, var(--bg) 55%, transparent) 42%, transparent 62%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "104px", zIndex: 3, pointerEvents: "none", background: "linear-gradient(to bottom, var(--bg), transparent)" }} />

      {/* Nav */}
      <nav data-rise="0" style={{ position: "relative", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px clamp(24px,4vw,52px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "linear-gradient(135deg, var(--primary), var(--primary-2))", display: "grid", placeItems: "center", boxShadow: "0 8px 18px -7px var(--glow), inset 0 0 0 1px rgba(255,255,255,.28)" }}>
            <div style={{ width: "16px", height: "16px", border: "2.6px solid #fff", borderRadius: "50%", position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "4.5px", height: "4.5px", background: "#fff", borderRadius: "50%" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "9px" }}>
            <span style={{ font: "700 17px/1 'DM Sans'", letterSpacing: "-.01em", color: "var(--ink)" }}>Manzil One</span>
            <span dir="rtl" style={{ font: "500 17px/1 'Noto Nastaliq Urdu', serif", color: "var(--primary)" }}>منزل ون</span>
            <span style={{ font: "600 9.5px/1 'DM Mono', monospace", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-2)", border: "1px solid var(--line-2)", borderRadius: "999px", padding: "4px 8px", marginLeft: "2px" }}>CRM Suite</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <a href="#" className="mzh-link" style={{ font: "500 13.5px/1 'DM Sans'", color: "var(--muted)", textDecoration: "none" }}>Product</a>
          <a href="#" className="mzh-link" style={{ font: "500 13.5px/1 'DM Sans'", color: "var(--muted)", textDecoration: "none" }}>Live metrics</a>
          <a href="#" className="mzh-link" style={{ font: "500 13.5px/1 'DM Sans'", color: "var(--muted)", textDecoration: "none" }}>Pricing</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div role="group" aria-label="Theme" style={{ position: "relative", display: "flex", alignItems: "center", width: "70px", height: "34px", padding: "3px", borderRadius: "999px", border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            <div style={knobStyle} />
            <button onClick={() => setGlobalTheme("light")} aria-label="Light" className="mzh-toggle" style={{ position: "relative", zIndex: 1, flex: 1, height: "100%", border: 0, background: "transparent", display: "grid", placeItems: "center", color: "var(--ink-2)", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            </button>
            <button onClick={() => setGlobalTheme("dark")} aria-label="Dark" className="mzh-toggle" style={{ position: "relative", zIndex: 1, flex: 1, height: "100%", border: 0, background: "transparent", display: "grid", placeItems: "center", color: "var(--ink-2)", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            </button>
          </div>
          <a href="/login" className="mzh-signin" style={{ font: "600 13px/1 'DM Sans'", color: "var(--ink-2)", textDecoration: "none", padding: "9px 14px", borderRadius: "10px", border: "1px solid var(--line-2)", background: "var(--glass)", backdropFilter: "blur(10px)" }}>Sign in</a>
          <a href="/signup" onClick={(e) => eng()?.onTrial(e)} className="mzh-nav-cta" style={{ display: "inline-flex", alignItems: "center", gap: "6px", font: "600 13px/1 'DM Sans'", color: "#fff", textDecoration: "none", borderRadius: "10px", padding: "10px 16px", background: "linear-gradient(180deg, var(--primary), var(--primary-deep))", boxShadow: "0 8px 18px -7px var(--glow), inset 0 0 0 1px rgba(255,255,255,.2), inset 0 1px 0 rgba(255,255,255,.35)" }}>Start free</a>
        </div>
      </nav>

      {/* Hero copy */}
      <div style={{ position: "relative", zIndex: 20, height: "calc(100vh - 73px)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px,4vw,52px)", pointerEvents: "none" }}>
        <div ref={contentRef} style={{ maxWidth: "540px", pointerEvents: "auto", willChange: "transform, opacity" }}>
          <h1 data-rise="120" style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "clamp(40px,4.6vw,62px)", lineHeight: 1.02, letterSpacing: "-.032em", color: "var(--ink)" }}>
            Guide every deal<br />to its <span style={{ color: "var(--primary)" }}>destination.</span>
          </h1>

          <p dir="rtl" data-rise="180" style={{ margin: "14px 0 0", font: "500 26px/1.9 'Noto Nastaliq Urdu', serif", color: "var(--ink-2)" }}>لیڈ سے کامیابی کی منزل تک</p>

          <p data-rise="240" style={{ margin: "18px 0 0", maxWidth: "440px", font: "400 16.5px/1.62 'DM Sans'", color: "var(--muted)" }}>
            Leads, opportunities, RFQs, quotations, approvals and forecasts — one elegant workspace, from first touch to closed&#8209;won.
          </p>

          <div data-rise="300" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "28px" }}>
            <a href="/signup" onClick={(e) => eng()?.onTrial(e)} className="mzh-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px", font: "600 14.5px/1 'DM Sans'", color: "#fff", textDecoration: "none", borderRadius: "12px", padding: "14px 22px", background: "linear-gradient(180deg, var(--primary), var(--primary-deep))", boxShadow: "0 12px 26px -10px var(--glow), inset 0 0 0 1px rgba(255,255,255,.2), inset 0 1px 0 rgba(255,255,255,.35)" }}>
              Start free trial
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <a href="/login" className="mzh-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "9px", font: "600 14.5px/1 'DM Sans'", color: "var(--ink-2)", textDecoration: "none", border: "1px solid var(--line-2)", borderRadius: "12px", padding: "14px 20px", background: "var(--glass)", backdropFilter: "blur(10px)" }}>
              <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--primary-tint)", display: "grid", placeItems: "center" }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="var(--primary)"><path d="M6 4l14 8-14 8z" /></svg>
              </span>
              See it in action
            </a>
          </div>

          <div data-rise="360" style={{ display: "flex", alignItems: "center", gap: "26px", marginTop: "38px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ font: "500 10px/1 'DM Mono', monospace", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted-2)" }}>Pipeline value</span>
              <span ref={pipelineRef} style={{ font: "600 23px/1 'DM Sans'", letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "var(--ink)", transformOrigin: "left center", display: "inline-block" }}>₹{counters.p.toFixed(1)} Cr</span>
            </div>
            <div style={{ width: "1px", height: "30px", background: "var(--line-2)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ font: "500 10px/1 'DM Mono', monospace", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted-2)" }}>Active opportunities</span>
              <span style={{ font: "600 23px/1 'DM Sans'", letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{Math.round(counters.o)}</span>
            </div>
            <div style={{ width: "1px", height: "30px", background: "var(--line-2)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ font: "500 10px/1 'DM Mono', monospace", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted-2)" }}>Closed&#8209;won</span>
              <span style={{ font: "600 23px/1 'DM Sans'", letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#10B981" }}>{Math.round(counters.w)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stage chips */}
      <div data-px="0.9" style={{ position: "absolute", top: "22%", left: "50%", zIndex: 8 }}>
        <div className="mzh-chip" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "7px 12px", borderRadius: "999px", background: "var(--glass-2)", backdropFilter: "blur(10px)", border: "1px solid var(--line-2)", boxShadow: "var(--shadow-card)" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F5A524", boxShadow: "0 0 0 3px rgba(245,165,36,.18)" }} />
          <span style={{ font: "600 12px/1 'DM Sans'", color: "var(--ink-2)" }}>Discovery</span>
        </div>
      </div>
      <div data-px="1.1" style={{ position: "absolute", top: "60%", right: "7%", zIndex: 8 }}>
        <div className="mzh-chip" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "7px 12px", borderRadius: "999px", background: "var(--glass-2)", backdropFilter: "blur(10px)", border: "1px solid var(--line-2)", boxShadow: "var(--shadow-card)" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06B6D4", boxShadow: "0 0 0 3px rgba(6,182,212,.18)" }} />
          <span style={{ font: "600 12px/1 'DM Sans'", color: "var(--ink-2)" }}>RFQ · Quotation</span>
        </div>
      </div>
      <div data-px="0.7" style={{ position: "absolute", bottom: "20%", left: "64%", zIndex: 8 }}>
        <div className="mzh-chip" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "7px 12px", borderRadius: "999px", background: "var(--glass-2)", backdropFilter: "blur(10px)", border: "1px solid var(--line-2)", boxShadow: "var(--shadow-card)" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366F1", boxShadow: "0 0 0 3px rgba(99,102,241,.18)" }} />
          <span style={{ font: "600 12px/1 'DM Sans'", color: "var(--ink-2)" }}>Approval</span>
        </div>
      </div>

      {/* Closed-won drop target */}
      <div ref={dropRef} style={{ position: "absolute", top: "30%", right: "13%", width: "172px", height: "172px", zIndex: 12, display: "grid", placeItems: "center", transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
        <div data-core="1" style={{ width: "94px", height: "94px", borderRadius: "50%", background: "var(--primary-tint)", color: "var(--primary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)", transition: "background .25s, color .25s, box-shadow .25s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z" /></svg>
          <span style={{ font: "700 9.5px/1.2 'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase" }}>Closed Won</span>
        </div>
      </div>

      {/* Draggable deal card */}
      <div style={{ position: "absolute", left: "61%", bottom: "15%", transform: "translateX(-50%)", zIndex: 14, width: "286px" }}>
        <div
          ref={cardRef}
          onPointerDown={(e) => eng()?.onCardDown(e)}
          onPointerEnter={() => eng()?.onCardEnter()}
          onPointerLeave={() => eng()?.onCardLeave()}
          style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "15px", padding: "13px 14px 12px 16px", boxShadow: "var(--shadow-pop)", cursor: "grab", touchAction: "none", willChange: "transform", userSelect: "none" }}
        >
          <div style={{ position: "absolute", left: 0, top: "14px", bottom: "14px", width: "4px", borderRadius: "0 3px 3px 0", background: st.color }} />
          <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "11px", display: "grid", placeItems: "center", font: "600 15px/1 'DM Sans'", color: "#fff", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)", background: st.color }}>{deal.badge}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ font: "600 15px/1.2 'DM Sans'", letterSpacing: "-.01em", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal.co}</div>
              <div style={{ font: "400 12px/1.3 'DM Sans'", color: "var(--muted)", marginTop: "2px" }}>{deal.sub}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "13px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ font: "500 9px/1 'DM Mono', monospace", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted-2)" }}>Deal value</span>
              <span style={{ font: "600 18px/1 'DM Sans'", letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>₹{deal.v.toFixed(2)} Cr</span>
            </div>
            <span style={{ font: "700 9.5px/1 'DM Sans'", letterSpacing: ".05em", textTransform: "uppercase", padding: "5px 9px", borderRadius: "999px", background: st.tint, color: st.textTint }}>{st.name}</span>
          </div>
          <div style={{ height: "5px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden", marginTop: "12px" }}>
            <div style={{ height: "100%", borderRadius: "3px", transition: "width .5s", width: deal.p + "%", background: st.color }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "11px", paddingTop: "10px", borderTop: "1px dashed var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ width: "22px", height: "22px", borderRadius: "50%", display: "grid", placeItems: "center", font: "600 9.5px/1 'DM Sans'", color: "#fff", background: deal.oc }}>{deal.owner}</span>
              <span style={{ font: "500 11.5px/1 'DM Sans'", color: "var(--muted)" }}>{deal.ownerName}</span>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", font: "600 11px/1 'DM Sans'", color: "var(--primary)" }}>
              Drag to win
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </div>
      </div>

      {/* Developer credit (absolute to the hero so it scrolls away with it) */}
      <div ref={creditWrapRef} style={{ position: "absolute", right: "26px", bottom: "24px", zIndex: 640 }}>
        <span ref={creditGlowRef} style={{ position: "absolute", inset: "-12px", borderRadius: "999px", background: "radial-gradient(closest-side, var(--glow), transparent)", filter: "blur(14px)", opacity: 0.5, pointerEvents: "none" }} />
        <a
          ref={creditRef}
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onPointerEnter={() => eng()?.onCreditEnter()}
          onPointerLeave={() => eng()?.onCreditLeave()}
          className="mzh-credit"
          style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "10px", padding: "7px 15px 7px 8px", borderRadius: "999px", background: "var(--glass-2)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid color-mix(in oklab, var(--primary) 38%, var(--line-2))", boxShadow: "0 12px 30px -12px var(--glow), var(--shadow-card)", textDecoration: "none", overflow: "hidden" }}
        >
          <span ref={creditSheenRef} style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "55%", pointerEvents: "none", transformOrigin: "left center", background: "linear-gradient(105deg, transparent, color-mix(in oklab, var(--primary) 20%, transparent) 44%, rgba(255,255,255,.6) 50%, color-mix(in oklab, var(--primary) 20%, transparent) 56%, transparent)", transform: "translateX(-180%) skewX(-12deg)" }} />
          <span ref={creditBadgeRef} style={{ position: "relative", width: "27px", height: "27px", borderRadius: "8px", background: "linear-gradient(135deg, var(--primary), var(--primary-2))", display: "grid", placeItems: "center", boxShadow: "0 5px 13px -4px var(--glow), inset 0 0 0 1px rgba(255,255,255,.28)", flexShrink: 0 }}>
            <svg ref={creditIconRef} width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ willChange: "transform" }}><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.2 8.5h4.6V23H.2V8.5zM8.5 8.5h4.4v2h.06c.61-1.16 2.1-2.38 4.34-2.38 4.64 0 5.5 3.05 5.5 7.02V23h-4.6v-6.31c0-1.5-.03-3.43-2.1-3.43-2.1 0-2.42 1.64-2.42 3.33V23H8.5V8.5z" /></svg>
          </span>
          <span style={{ position: "relative", display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ font: "500 9px/1 'DM Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-2)" }}>Designed &amp; developed by</span>
            <span style={{ font: "600 13px/1.1 'DM Sans'", color: "var(--ink)", marginTop: "3px" }}>Syed Abdul Kareem</span>
          </span>
          <svg ref={creditArrowRef} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", marginLeft: "2px", flexShrink: 0, transition: "transform .25s cubic-bezier(.34,1.56,.64,1)" }}><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
        </a>
      </div>

      {/* Confetti layer */}
      <div ref={confettiRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 700 }} />

      {/* Toast */}
      {toast ? (
        <div ref={toastRef} style={{ position: "fixed", left: "50%", bottom: "30px", transform: "translateX(-50%)", zIndex: 800, display: "flex", alignItems: "center", gap: "13px", padding: "13px 18px 13px 15px", borderRadius: "14px", background: "#14161D", color: "#fff", boxShadow: "0 26px 64px -22px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.08)" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#10B981", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 6px 16px -4px rgba(16,185,129,.6)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div>
            <div style={{ font: "600 13.5px/1.2 'DM Sans'" }}>{toast.title}</div>
            <div style={{ font: "400 12px/1.3 'DM Sans'", opacity: 0.66, marginTop: "2px" }}>{toast.sub}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HeroV2;
