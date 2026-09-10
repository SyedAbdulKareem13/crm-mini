"use client";

import { memo, useId } from "react";

const PETAL = "M0 0 C -26 -22 -30 -72 0 -112 C 30 -72 26 -22 0 0 Z";

export interface LotusProps {
  className?: string;
  style?: React.CSSProperties;
  /** golden (on dark) or blush (on ivory) */
  tone?: "gold" | "blush";
}

/**
 * Thamarai — three rows of petals. Each petal carries data-petal with its
 * transform-origin at the base so GSAP can bloom it (scale + rotate).
 */
export const Lotus = memo(function Lotus({ className, style, tone = "gold" }: LotusProps) {
  const id = useId().replace(/:/g, "");
  const g1 = `lotus-a-${id}`, g2 = `lotus-b-${id}`, g3 = `lotus-c-${id}`;
  const cols =
    tone === "gold"
      ? { a: ["#7a5416", "#d8b25e"], b: ["#a8822e", "#efd89a"], c: ["#d8b25e", "#fbf1d2"] }
      : { a: ["#b8552f", "#f0b8a6"], b: ["#d98771", "#fbe0d6"], c: ["#f0c6b8", "#fff6f1"] };

  const row = (angles: number[], scale: number, fill: string, k: string) =>
    angles.map((a, i) => (
      <g key={`${k}${i}`} className="petal-breathe" style={{ animationDelay: `${-(i * 0.9 + (k === "a" ? 0 : k === "b" ? 0.4 : 0.8))}s` } as React.CSSProperties}>
        <path
          d={PETAL}
          data-petal
          fill={fill}
          stroke="#8e6a1f"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          style={{ transformOrigin: "160px 200px", transformBox: "view-box" } as React.CSSProperties}
          transform={`translate(160 200) rotate(${a}) scale(${scale})`}
        />
      </g>
    ));

  return (
    <svg viewBox="0 0 320 240" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={g1} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={cols.a[0]} /><stop offset="1" stopColor={cols.a[1]} /></linearGradient>
        <linearGradient id={g2} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={cols.b[0]} /><stop offset="1" stopColor={cols.b[1]} /></linearGradient>
        <linearGradient id={g3} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={cols.c[0]} /><stop offset="1" stopColor={cols.c[1]} /></linearGradient>
      </defs>
      {row([-58, -30, 0, 30, 58], 1, `url(#${g1})`, "a")}
      {row([-44, -15, 15, 44], 0.9, `url(#${g2})`, "b")}
      {row([-24, 0, 24], 0.78, `url(#${g3})`, "c")}
      <path d="M100 200 Q160 240 220 200 Q160 214 100 200 Z" fill="#6b4d16" opacity="0.9" />
      <path d="M112 200 Q160 224 208 200 Q160 208 112 200 Z" fill="#c9a24a" opacity="0.55" />
    </svg>
  );
});
