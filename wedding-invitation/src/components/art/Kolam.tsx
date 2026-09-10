import { memo } from "react";

type Pt = [number, number];
const polar = (cx: number, cy: number, r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const f = (n: number) => n.toFixed(2);

/** Catmull-Rom → cubic Bézier, closed loop */
function closedSmoothPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

/** A sikku (looping) curve that weaves in and out around a ring of dots */
function weave(cx: number, cy: number, R: number, A: number, k: number, sign: 1 | -1): string {
  const pts: Pt[] = [];
  const N = k * 10;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    pts.push(polar(cx, cy, R + sign * A * Math.sin(k * t), t));
  }
  return closedSmoothPath(pts);
}

const PETAL = "M0 0 C -17 -11 -17 -44 0 -58 C 17 -44 17 -11 0 0 Z";
const PAISLEY = "M0 0 c-13 -9 -17 -30 -6 -43 c8 -9 20 -8 24 2 c5 12 -4 26 -18 41 z";
const DROP = "M0 0 c-5.5 -7 -5.5 -17 0 -25 c5.5 8 5.5 18 0 25 z";

export interface KolamProps {
  className?: string;
  style?: React.CSSProperties;
  /** full = all rings; core = centre + first weave (small usage) */
  variant?: "full" | "core";
  /** keep hairlines thin even when the SVG is scaled huge */
  hairline?: boolean;
  strokeWidth?: number;
  dotColor?: string;
}

/**
 * Procedural pulli-kolam in rotational symmetry.
 * Every stroke carries data-draw so GSAP can “draw” it on reveal.
 */
export function KolamSvg({
  className,
  style,
  variant = "full",
  hairline = false,
  strokeWidth = 1.4,
  dotColor = "currentColor",
}: KolamProps) {
  const cx = 200, cy = 200;
  const ve = hairline ? "non-scaling-stroke" : undefined;

  const dots = (r: number, n: number, offset: number, size: number) =>
    Array.from({ length: n }, (_, i) => {
      const [x, y] = polar(cx, cy, r, offset + (i / n) * Math.PI * 2);
      return <circle key={`${r}-${i}`} cx={f(x)} cy={f(y)} r={size} fill={dotColor} />;
    });

  const repeat = (n: number, r: number, d: string, scale = 1, angleOffset = 0, extraRotate = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = angleOffset + (i / n) * Math.PI * 2;
      const [x, y] = polar(cx, cy, r, a);
      const deg = (a * 180) / Math.PI + 90 + extraRotate;
      return (
        <path
          key={`${r}-${d.length}-${i}`}
          d={d}
          data-draw
          transform={`translate(${f(x)} ${f(y)}) rotate(${f(deg)}) scale(${scale})`}
          vectorEffect={ve}
        />
      );
    });

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      style={style}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* centre lotus */}
      <circle cx={cx} cy={cy} r={6} data-draw vectorEffect={ve} />
      {repeat(8, 8, PETAL, 0.62)}
      {dots(46, 8, Math.PI / 8, 2.4)}
      {/* first weave */}
      <path d={weave(cx, cy, 46, 13, 8, 1)} data-draw vectorEffect={ve} />
      <path d={weave(cx, cy, 46, 13, 8, -1)} data-draw vectorEffect={ve} />

      {variant === "full" && (
        <g>
          {/* paisley ring */}
          {repeat(16, 82, PAISLEY, 0.9, 0, 12)}
          {dots(74, 16, Math.PI / 16, 2)}
          {/* second weave */}
          {dots(126, 24, Math.PI / 24, 2.2)}
          <path d={weave(cx, cy, 126, 16, 12, 1)} data-draw vectorEffect={ve} />
          <path d={weave(cx, cy, 126, 16, 12, -1)} data-draw vectorEffect={ve} />
          {/* petal ring */}
          {repeat(24, 150, PETAL, 0.55)}
          {/* fringe */}
          {repeat(48, 186, DROP, 0.6, Math.PI / 48)}
          <circle cx={cx} cy={cy} r={194} data-draw vectorEffect={ve} strokeDasharray="1 5" />
        </g>
      )}
    </svg>
  );
}

export const Kolam = memo(KolamSvg);
