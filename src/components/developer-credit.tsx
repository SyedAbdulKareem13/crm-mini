"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  AnimatePresence,
  type MotionValue,
  type MotionStyle,
  type Variants,
} from "framer-motion";
import { Linkedin, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================== *
 * Manzil One — Developer Credit card
 * Direction: COSMIC NAJM CONSTELLATION
 *
 * A deep-midnight glass object suspended in a void: a slow conic aurora
 * behind the glass, a parallax starfield + faint constellation, several
 * elliptically ORBITING 4-point "Najm" guiding stars at varied depths
 * and speeds (the centerpiece — the brand star animated as orbiting
 * bodies), a rare comet-glint sweep, a brushed-metal light-streak whose
 * ANGLE tracks the cursor, a cursor-follow spotlight + warm glint, a
 * sparing tilt-driven iridescence, 3D mouse tilt, layered translateZ
 * depth planes, and a strongly magnetic LinkedIn CTA. The "SA" monogram
 * is filled with the exact Najm amber->coral gradient to tie the card
 * to the brand mark.
 *
 * Hard rules respected:
 *  - Only react / framer-motion v11 / lucide-react. No <img>, no network,
 *    no external fonts.
 *  - SSR-safe: window/document never read during render; all geometry is
 *    derived inside pointer handlers via event.currentTarget.getBoundingClientRect().
 *  - Animates transform / opacity / filter only; <= 8 ambient stars;
 *    will-change on heavy layers; 60fps target.
 *  - useReducedMotion(): a completely separate, calm static render tree
 *    (no tilt, no glare-follow, no infinite loops, no entrance) — selected
 *    via a JSX conditional, NOT an early return, so hook order is constant.
 * ================================================================== */

const LINKEDIN_URL =
  "https://www.linkedin.com/in/syed-abdul-kareem-b33519200/";
const LINKEDIN_BLUE = "#0A66C2";

/** Najm guiding-star path — shared with the brand mark. */
const NAJM_PATH =
  "M100 10 C108 72 128 92 190 100 C128 108 108 128 100 190 C92 128 72 108 10 100 C72 92 92 72 100 10 Z";

/** Najm warm gradient stops (amber -> coral) — the brand fill. */
const NAJM_GRADIENT =
  "linear-gradient(135deg, #FFE9C2 0%, #FF8A65 45%, #FF5C5C 100%)";

/** Dark metallic tile fill (echoes the logo mark). */
const METAL_TILE =
  "radial-gradient(120% 120% at 30% 20%, #2A2D34 0%, #14151A 55%, #0B0C10 100%)";

/* ------------------------------------------------------------------ *
 * Reusable 4-point Najm star.
 * Each instance gets a useId()-scoped gradient id so any number of
 * stars can render on the page with zero <defs> id collisions.
 * ------------------------------------------------------------------ */
function NajmStar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const gid = React.useId();
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE9C2" />
          <stop offset="0.45" stopColor="#FF8A65" />
          <stop offset="1" stopColor="#FF5C5C" />
        </linearGradient>
      </defs>
      <path d={NAJM_PATH} fill={`url(#${gid})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Orbiting Najm stars — varied depth (drives parallax + scale + glow +
 * opacity) and speed. Eight ambient stars total: 4 orbiting + 4 twinkles.
 * ------------------------------------------------------------------ */
type OrbitStar = {
  id: number;
  cx: number; // orbit center, % of card
  cy: number;
  rx: number; // orbit radii, px
  ry: number;
  size: number; // px
  duration: number; // s per revolution
  delay: number;
  depth: number; // 0 (far) .. 1 (near)
  dir: 1 | -1;
};

const ORBIT_STARS: OrbitStar[] = [
  { id: 1, cx: 80, cy: 24, rx: 30, ry: 17, size: 24, duration: 16, delay: 0, depth: 1, dir: 1 },
  { id: 2, cx: 20, cy: 68, rx: 36, ry: 21, size: 16, duration: 21, delay: 1.6, depth: 0.62, dir: -1 },
  { id: 3, cx: 62, cy: 82, rx: 19, ry: 12, size: 12, duration: 13, delay: 0.7, depth: 0.4, dir: 1 },
  { id: 4, cx: 36, cy: 16, rx: 23, ry: 13, size: 9, duration: 26, delay: 2.4, depth: 0.25, dir: -1 },
];

/* Static twinkle field — also the reduced-motion decoration (4 stars). */
const TWINKLES = [
  { left: "12%", top: "22%", size: 4, o: 0.9 },
  { left: "84%", top: "60%", size: 5, o: 0.8 },
  { left: "30%", top: "82%", size: 3, o: 0.7 },
  { left: "92%", top: "34%", size: 2, o: 0.5 },
];

/* ------------------------------------------------------------------ *
 * One orbiting Najm star. Owns its own parallax hooks so the parent
 * never calls hooks inside a .map() loop (Rules-of-Hooks-safe pattern).
 * Parallax depth maps the shared tilt springs at a per-star rate so the
 * stars sit on visibly different planes; orbit + twinkle are independent
 * infinite loops on transform/opacity/filter only.
 * ------------------------------------------------------------------ */
function OrbitingNajm({
  star,
  sx,
  sy,
}: {
  star: OrbitStar;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  // Nearer stars (higher depth) parallax more strongly.
  const range = 16 + star.depth * 30;
  const parX = useTransform(sx, [-0.5, 0.5], [range, -range]);
  const parY = useTransform(sy, [-0.5, 0.5], [range * 0.8, -range * 0.8]);

  const baseScale = 0.85 + star.depth * 0.15;
  const glow = 4 + star.depth * 8;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${star.cx}%`,
        top: `${star.cy}%`,
        width: star.size,
        height: star.size,
        marginLeft: -star.size / 2,
        marginTop: -star.size / 2,
        x: parX,
        y: parY,
        translateZ: 20 + star.depth * 40,
        willChange: "transform",
      }}
    >
      {/* Orbit: elliptical path traced via keyframed x/y + spin. */}
      <motion.div
        className="h-full w-full"
        style={{ willChange: "transform" }}
        animate={{
          x: [star.rx, 0, -star.rx, 0, star.rx].map((v) => v * star.dir),
          y: [0, star.ry, 0, -star.ry, 0],
          rotate: [0, 90, 180, 270, 360].map((d) => d * star.dir),
        }}
        transition={{
          duration: star.duration,
          repeat: Infinity,
          ease: "linear",
          delay: star.delay,
        }}
      >
        {/* Depth-scaled twinkle (scale + glow + opacity). */}
        <motion.div
          className="h-full w-full"
          style={{ opacity: 0.35 + star.depth * 0.5, willChange: "transform" }}
          animate={{ scale: [baseScale, baseScale + 0.18, baseScale] }}
          transition={{
            duration: 3 + star.depth * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
        >
          <NajmStar
            className="h-full w-full"
            style={{ filter: `drop-shadow(0 0 ${glow}px rgba(255,138,101,0.55))` }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== *
 * REDUCED-MOTION render tree — a calm, fully static starlit card.
 * No tilt, no glare-follow, no loops, no entrance. Rendered via a JSX
 * conditional from the single exported component (not an early return),
 * so hooks always run in the same order on every render.
 * ================================================================== */
function StaticCredit() {
  return (
    <section
      aria-label="Designed and developed by Syed Abdul Kareem"
      className="relative mx-auto w-full max-w-xl"
    >
      {/* Soft, still aura behind the glass. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(120% 120% at 20% 0%, hsl(var(--chart-1) / 0.30), transparent 55%), radial-gradient(120% 120% at 100% 100%, hsl(var(--chart-5) / 0.26), transparent 55%)",
        }}
      />

      <div
        className="luxury-card shadow-luxury relative overflow-hidden p-8 text-white/90 ring-1 ring-white/10 sm:p-10"
        style={{ backgroundColor: "#0B0C10" }}
      >
        {/* Deep-midnight base + faint nebula wash. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(140% 120% at 80% 0%, #1A1C24 0%, #0B0C10 55%, #07080B 100%)",
          }}
        />

        {/* Dimmed-but-present static stars. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {TWINKLES.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-amber-50"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                opacity: s.o * 0.8,
                boxShadow: "0 0 6px 1px rgba(255,233,194,0.5)",
              }}
            />
          ))}
          {ORBIT_STARS.map((s) => (
            <div
              key={s.id}
              className="absolute"
              style={{
                left: `${s.cx}%`,
                top: `${s.cy}%`,
                width: s.size,
                height: s.size,
                marginLeft: -s.size / 2,
                marginTop: -s.size / 2,
                opacity: 0.4 + s.depth * 0.4,
              }}
            >
              <NajmStar
                className="h-full w-full"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,138,101,0.45))" }}
              />
            </div>
          ))}
        </div>

        {/* Hairline top sheen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
          <div className="relative shrink-0">
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl ring-1 ring-white/10"
              style={{
                backgroundImage: METAL_TILE,
                boxShadow:
                  "0 18px 40px -18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 20px -12px rgba(0,0,0,0.8)",
              }}
            >
              <span
                className="font-display relative text-4xl font-semibold tracking-tight"
                style={{
                  backgroundImage: NAJM_GRADIENT,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.14), 0 2px 18px rgba(255,138,101,0.25)",
                }}
              >
                SA
              </span>
              <span aria-hidden className="absolute -right-2 -top-2 h-7 w-7">
                <NajmStar
                  className="h-full w-full"
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,138,101,0.7))" }}
                />
              </span>
            </div>
          </div>

          <div className="mt-6 sm:ml-7 sm:mt-0">
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-amber-200/70 sm:justify-start">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Designed &amp; developed by
            </p>
            <h3 className="font-display mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Syed Abdul Kareem
            </h3>
            <p className="mt-1.5 text-sm text-white/55">
              Full-stack engineer · Architect of Manzil One
            </p>
            <div className="mt-6 flex justify-center sm:justify-start">
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white",
                  "ring-1 ring-white/15 transition hover:brightness-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C10]"
                )}
                style={{
                  backgroundColor: LINKEDIN_BLUE,
                  backgroundImage: `linear-gradient(135deg, ${LINKEDIN_BLUE} 0%, #0a5bb0 100%)`,
                  boxShadow: `0 12px 30px -10px ${LINKEDIN_BLUE}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                <Linkedin className="h-4 w-4" aria-hidden />
                <span>Connect on LinkedIn</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {/* Inner vignette. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 80px -24px rgba(0,0,0,0.9)" }}
        />
      </div>
    </section>
  );
}

/* ================================================================== *
 * FULL-MOTION render tree.
 * ================================================================== */
function AnimatedCredit() {
  // Pointer normalized to [-0.5, 0.5] around card center (tilt + parallax).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // Raw pointer position in % of the card (spotlight / sheen gradients).
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const [hovering, setHovering] = React.useState(false);

  // Heavy, "machined" settle — mass 0.7 (Concept 1's tasteful tuning).
  const springCfg = { stiffness: 150, damping: 22, mass: 0.7 };
  const sx = useSpring(px, springCfg);
  const sy = useSpring(py, springCfg);

  // 1. 3D tilt — restrained +/-8deg cap for a weighty, premium feel.
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9]);

  // 4. Layered parallax — each plane translates at a different rate.
  const decoX = useTransform(sx, [-0.5, 0.5], [38, -38]);
  const decoY = useTransform(sy, [-0.5, 0.5], [30, -30]);
  const midX = useTransform(sx, [-0.5, 0.5], [22, -22]);
  const midY = useTransform(sy, [-0.5, 0.5], [18, -18]);
  const monoX = useTransform(sx, [-0.5, 0.5], [-18, 18]);
  const monoY = useTransform(sy, [-0.5, 0.5], [-14, 14]);
  const textX = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const textY = useTransform(sy, [-0.5, 0.5], [-7, 7]);

  // 2. Cursor-follow spotlight + warm glint (built from live motion values).
  const spotlight = useMotionTemplate`radial-gradient(440px circle at ${gx}% ${gy}%, hsl(var(--primary) / 0.18), transparent 60%)`;
  const glint = useMotionTemplate`radial-gradient(200px circle at ${gx}% ${gy}%, rgba(255,233,194,0.22), transparent 70%)`;

  // Anisotropic brushed-metal light-streak whose ANGLE tracks the cursor
  // (Concept 1's signature gesture), composited mix-blend-overlay.
  const sheenAngle = useTransform(sx, [-0.5, 0.5], [108, 72]);
  const sheen = useMotionTemplate`linear-gradient(${sheenAngle}deg, transparent 38%, rgba(255,255,255,0.10) 50%, transparent 62%)`;

  // Sparing tilt-driven iridescence on the aurora (Concept 2), used gently.
  const hue = useTransform(sx, [-0.5, 0.5], [-26, 26]);
  const holoFilter = useMotionTemplate`hue-rotate(${hue}deg) saturate(1.2)`;

  // 3. Magnetic CTA — strong pull toward the cursor, springs back on leave.
  const magX = useMotionValue(0);
  const magY = useMotionValue(0);
  const magSpringX = useSpring(magX, { stiffness: 260, damping: 16, mass: 0.5 });
  const magSpringY = useSpring(magY, { stiffness: 260, damping: 16, mass: 0.5 });

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      px.set(relX - 0.5);
      py.set(relY - 0.5);
      gx.set(relX * 100);
      gy.set(relY * 100);
    },
    [px, py, gx, gy]
  );

  const handleMouseEnter = React.useCallback(() => {
    setHovering(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setHovering(false);
    px.set(0);
    py.set(0);
    gx.set(50);
    gy.set(50);
    magX.set(0);
    magY.set(0);
  }, [px, py, gx, gy, magX, magY]);

  const handleCtaMove = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      magX.set(Math.max(-16, Math.min(16, (e.clientX - cx) * 0.5)));
      magY.set(Math.max(-12, Math.min(12, (e.clientY - cy) * 0.55)));
    },
    [magX, magY]
  );

  const handleCtaLeave = React.useCallback(() => {
    magX.set(0);
    magY.set(0);
  }, [magX, magY]);

  // 6. Entrance — fade + scale + slight y, staggered children. On the OUTER
  // section so it never conflicts with the inner card's MotionValue tilt.
  const container: Variants = {
    hidden: { opacity: 0, y: 26, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.09,
        delayChildren: 0.12,
      },
    },
  };
  const child: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardTilt: MotionStyle = {
    rotateX,
    rotateY,
    transformStyle: "preserve-3d",
    willChange: "transform",
    backgroundColor: "#0B0C10",
  };

  return (
    <motion.section
      aria-label="Designed and developed by Syed Abdul Kareem"
      className="relative mx-auto w-full max-w-xl"
      style={{ perspective: 1200 }}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
    >
      {/* Ambient aurora glow behind the glass (slow flowing, transform-only). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-3xl"
        style={{
          background:
            "conic-gradient(from 120deg at 50% 50%, hsl(var(--chart-1) / 0.35), hsl(var(--chart-5) / 0.30), hsl(var(--chart-2) / 0.30), hsl(var(--chart-1) / 0.35))",
          filter: holoFilter,
          willChange: "transform, filter",
        }}
        animate={{ rotate: 360, scale: [1, 1.06, 1] }}
        transition={{
          rotate: { duration: 30, repeat: Infinity, ease: "linear" },
          scale: { duration: 10, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      <motion.div
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="luxury-card shadow-luxury relative overflow-hidden p-8 text-white/90 ring-1 ring-white/10 sm:p-10"
        style={cardTilt}
      >
        {/* Deep-midnight base + faint nebula wash. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(140% 120% at 80% 0%, #1A1C24 0%, #0B0C10 55%, #07080B 100%)",
          }}
        />

        {/* Hairline gradient ring on the glass edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            padding: 1,
            background:
              "linear-gradient(140deg, hsl(var(--chart-1) / 0.55), transparent 35%, transparent 65%, hsl(var(--chart-5) / 0.45))",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* ---- FAR layer: parallax starfield + constellation ---- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ x: decoX, y: decoY, willChange: "transform" }}
        >
          {TWINKLES.map((s, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-amber-50"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                opacity: s.o,
                boxShadow: "0 0 6px 1px rgba(255,233,194,0.55)",
                willChange: "opacity, transform",
              }}
              animate={{
                opacity: [s.o * 0.4, s.o, s.o * 0.4],
                scale: [0.8, 1.15, 0.8],
              }}
              transition={{
                duration: 2.4 + (i % 4) * 0.7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
          {/* Faint constellation lines threading a few stars. */}
          <motion.svg
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.26, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <polyline
              points="12%,22% 92%,34% 84%,60% 30%,82%"
              fill="none"
              stroke="rgba(255,233,194,0.5)"
              strokeWidth="1"
              strokeDasharray="2 6"
              vectorEffect="non-scaling-stroke"
            />
          </motion.svg>
        </motion.div>

        {/* ---- MID layer: orbiting Najm stars at varied depths/speeds ---- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            x: midX,
            y: midY,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          {ORBIT_STARS.map((s) => (
            <OrbitingNajm key={s.id} star={s} sx={sx} sy={sy} />
          ))}
        </motion.div>

        {/* ---- Rare comet-glint sweep across the glass ---- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-y-12 -left-1/3 w-1/3 -skew-x-12"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,233,194,0.14), rgba(255,255,255,0.05), transparent)",
            willChange: "transform, opacity",
          }}
          animate={{ x: ["0%", "520%"], opacity: [0, 1, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
        />

        {/* ---- Anisotropic brushed-metal sheen (angle tracks cursor) ---- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: sheen, willChange: "background" }}
        />

        {/* ---- Cursor-follow spotlight + warm glint (hover only) ---- */}
        <AnimatePresence>
          {hovering ? (
            <>
              <motion.div
                key="spotlight"
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: spotlight, willChange: "opacity" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                key="glint"
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{ background: glint, willChange: "opacity" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </>
          ) : null}
        </AnimatePresence>

        {/* Hairline top sheen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />

        {/* ===================== CONTENT (parallax planes) ===================== */}
        <div
          className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ---- Dark metallic monogram tile (nearest plane, Z 80) ---- */}
          <motion.div
            variants={child}
            className="relative shrink-0"
            style={{
              x: monoX,
              y: monoY,
              translateZ: 80,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl ring-1 ring-white/10"
              style={{
                backgroundImage: METAL_TILE,
                boxShadow:
                  "0 18px 40px -18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 20px -12px rgba(0,0,0,0.8)",
              }}
            >
              {/* Warm amber-coral glint sweeping the metal. */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  background:
                    "radial-gradient(60% 60% at 30% 20%, rgba(255,138,101,0.35), transparent 70%)",
                  willChange: "opacity, transform",
                }}
                animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.08, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* "SA" in the Najm amber->coral gradient, with embossed shadow. */}
              <span
                className="font-display relative text-4xl font-semibold tracking-tight"
                style={{
                  backgroundImage: NAJM_GRADIENT,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.16), 0 2px 18px rgba(255,138,101,0.25)",
                }}
              >
                SA
              </span>

              {/* Tiny rotating Najm glint pinned to the corner (badge plane). */}
              <motion.div
                aria-hidden
                className="absolute -right-2 -top-2 h-7 w-7"
                style={{ translateZ: 60, willChange: "transform" }}
                animate={{ rotate: 360, scale: [0.9, 1.12, 0.9] }}
                transition={{
                  rotate: { duration: 16, repeat: Infinity, ease: "linear" },
                  scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <NajmStar
                  className="h-full w-full"
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,138,101,0.7))" }}
                />
              </motion.div>

              {/* Moving sheen across the monogram face. */}
              <motion.span
                aria-hidden
                className="absolute inset-0 overflow-hidden rounded-3xl"
                style={{ willChange: "transform, opacity" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
              >
                <motion.span
                  className="block h-full w-1/3 -skew-x-12"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                  }}
                  initial={{ x: "-140%" }}
                  animate={{ x: ["-140%", "260%"] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
                />
              </motion.span>
            </div>
          </motion.div>

          {/* ---- Text block (mid-near plane, Z 44) ---- */}
          <motion.div
            className="mt-6 sm:ml-7 sm:mt-0"
            style={{
              x: textX,
              y: textY,
              translateZ: 44,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <motion.p
              variants={child}
              className="flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-amber-200/70 sm:justify-start"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Designed &amp; developed by
            </motion.p>

            <motion.h3
              variants={child}
              className="font-display mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Syed Abdul Kareem
            </motion.h3>

            <motion.p variants={child} className="mt-1.5 text-sm text-white/55">
              Full-stack engineer · Architect of Manzil One
            </motion.p>

            {/* ---- Status badge — animate-ping offloaded to the compositor ---- */}
            <motion.div variants={child} className="mt-4 flex justify-center sm:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.06] px-3 py-1 text-[11px] font-medium text-amber-100/90">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
                </span>
                Crafted with precision
              </span>
            </motion.div>

            {/* ---- Magnetic LinkedIn CTA (front-most plane, Z 90) ---- */}
            <motion.div
              variants={child}
              className="mt-6 flex justify-center sm:justify-start"
              style={{ translateZ: 90 }}
            >
              <motion.a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={handleCtaMove}
                onMouseLeave={handleCtaLeave}
                aria-label="Connect with Syed Abdul Kareem on LinkedIn"
                className={cn(
                  "group/cta relative inline-flex items-center gap-2.5 overflow-hidden rounded-full",
                  "px-5 py-2.5 text-sm font-semibold text-white",
                  "ring-1 ring-white/15 transition-shadow",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C10]"
                )}
                style={{
                  x: magSpringX,
                  y: magSpringY,
                  backgroundColor: LINKEDIN_BLUE,
                  backgroundImage: `linear-gradient(135deg, ${LINKEDIN_BLUE} 0%, #0a5bb0 100%)`,
                  boxShadow: `0 12px 30px -10px ${LINKEDIN_BLUE}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                  willChange: "transform",
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
              >
                {/* Sheen sweep on hover. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] transition-transform duration-700 ease-out group-hover/cta:translate-x-full"
                />
                <Linkedin className="relative h-4 w-4 shrink-0" aria-hidden />
                <span className="relative">Connect on LinkedIn</span>
                <ArrowRight
                  className="relative h-4 w-4 shrink-0 transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
                  aria-hidden
                />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* Subtle inner vignette to seat content in the void. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 0 80px -24px rgba(0,0,0,0.9)",
          }}
        />

        {/* Hover-only edge bloom for extra depth (cheap opacity tween). */}
        <AnimatePresence>
          {hovering ? (
            <motion.div
              key="bloom"
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                boxShadow:
                  "0 0 0 1px hsl(var(--primary) / 0.25), 0 30px 80px -30px hsl(var(--primary) / 0.45)",
              }}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

/* ================================================================== *
 * Public component. Branches to a calm static tree under reduced motion
 * (via a JSX conditional, so hook order stays constant across renders).
 * ================================================================== */
export function DeveloperCredit() {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? <StaticCredit /> : <AnimatedCredit />;
}

export default DeveloperCredit;