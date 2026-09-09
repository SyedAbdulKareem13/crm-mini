import { memo } from "react";
import { seeded } from "@/lib/utils";

const f = (n: number) => n.toFixed(1);

/** Point on quadratic Bézier */
function qb(t: number, p0: number[], p1: number[], p2: number[]) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

export interface ThoranamProps {
  className?: string;
  style?: React.CSSProperties;
  leaves?: number;
}

/** Mango-leaf thoranam strung across the top of a scene, with marigold clusters. */
export const Thoranam = memo(function Thoranam({ className, style, leaves = 26 }: ThoranamProps) {
  const p0 = [0, 6], p1 = [600, 118], p2 = [1200, 6];
  const rnd = seeded(7);
  const items = Array.from({ length: leaves }, (_, i) => {
    const t = (i + 0.5) / leaves;
    const [x, y] = qb(t, p0, p1, p2);
    // slope for hanging angle
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI * 0.35 + (rnd() - 0.5) * 8;
    return { x, y, angle, scale: 0.85 + rnd() * 0.3, delay: rnd() * 4, marigold: i % 4 === 1 };
  });

  return (
    <svg viewBox="0 0 1200 190" className={className} style={style} aria-hidden preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="thoranam-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f9a5e" />
          <stop offset="0.6" stopColor="#2f6b3f" />
          <stop offset="1" stopColor="#1c4a2b" />
        </linearGradient>
        <radialGradient id="thoranam-marigold" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#ffd35c" />
          <stop offset="0.6" stopColor="#f39a1e" />
          <stop offset="1" stopColor="#c8611a" />
        </radialGradient>
      </defs>
      {/* string */}
      <path d={`M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke="#c9a24a" strokeWidth="2.2" />
      <path d={`M ${p0[0]} ${p0[1] + 3} Q ${p1[0]} ${p1[1] + 3} ${p2[0]} ${p2[1] + 3}`} fill="none" stroke="#8e6a1f" strokeWidth="1" opacity="0.6" />

      {items.map((it, i) => (
        <g key={i} transform={`translate(${f(it.x)} ${f(it.y)})`}>
          <g className="sway" style={{ animationDelay: `-${it.delay}s`, animationDuration: `${4.5 + (i % 3)}s` }}>
            <g transform={`rotate(${f(it.angle)}) scale(${f(it.scale)})`}>
              {it.marigold ? (
                <g>
                  <path d="M0 0 V 14" stroke="#8e6a1f" strokeWidth="1.5" />
                  {Array.from({ length: 8 }, (_, k) => (
                    <circle key={k} cx={f(Math.cos((k / 8) * Math.PI * 2) * 7)} cy={f(26 + Math.sin((k / 8) * Math.PI * 2) * 7)} r="5.5" fill="url(#thoranam-marigold)" />
                  ))}
                  <circle cx="0" cy="26" r="6" fill="#ffd35c" />
                  <circle cx="0" cy="26" r="2.5" fill="#c8611a" />
                </g>
              ) : (
                <g>
                  <path d="M0 0 V 8" stroke="#8e6a1f" strokeWidth="1.4" />
                  <path d="M0 8 C -11 20 -13 46 0 66 C 13 46 11 20 0 8 Z" fill="url(#thoranam-leaf)" />
                  <path d="M0 12 V 60" stroke="#dbe9c2" strokeWidth="0.9" opacity="0.7" />
                  <path d="M0 24 l -5 8 M0 32 l 5 8 M0 40 l -4 7" stroke="#dbe9c2" strokeWidth="0.6" opacity="0.5" />
                </g>
              )}
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
});
