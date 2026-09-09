import { memo } from "react";

const f = (n: number) => n.toFixed(1);

export interface PeacockFeatherProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Mayil iragu — a single peacock feather with fanning barbs and an iridescent eye. */
export const PeacockFeather = memo(function PeacockFeather({ className, style }: PeacockFeatherProps) {
  const barbs = Array.from({ length: 34 }, (_, i) => {
    const y = 150 + i * 7.6;
    const t = i / 33;
    const len = 46 * Math.sin(Math.PI * (0.25 + t * 0.75)) + 10;
    return { y, len, op: 0.35 + 0.45 * (1 - t) };
  });
  return (
    <svg viewBox="0 0 160 420" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id="pf-eye-outer" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#4c8d5f" />
          <stop offset="1" stopColor="#1e4a3e" />
        </radialGradient>
        <linearGradient id="pf-barb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f6f6b" />
          <stop offset="1" stopColor="#8fbf7a" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {barbs.map((b, i) => (
        <g key={i} opacity={b.op}>
          <path d={`M80 ${f(b.y)} C ${f(80 + b.len * 0.5)} ${f(b.y - 8)} ${f(80 + b.len * 0.9)} ${f(b.y - 12)} ${f(80 + b.len)} ${f(b.y - 20)}`} stroke="url(#pf-barb)" strokeWidth="1.1" fill="none" />
          <path d={`M80 ${f(b.y)} C ${f(80 - b.len * 0.5)} ${f(b.y - 8)} ${f(80 - b.len * 0.9)} ${f(b.y - 12)} ${f(80 - b.len)} ${f(b.y - 20)}`} stroke="url(#pf-barb)" strokeWidth="1.1" fill="none" transform="scale(1 1)" />
        </g>
      ))}
      <path d="M80 420 C 80 320 80 220 80 96" stroke="#c9a24a" strokeWidth="2" fill="none" />
      {/* eye */}
      <g transform="translate(80 100)">
        <ellipse rx="40" ry="54" fill="url(#pf-eye-outer)" />
        <ellipse rx="30" ry="41" fill="#1f6f6b" />
        <ellipse rx="21" ry="29" fill="#c9a24a" />
        <ellipse rx="13" ry="19" cy="2" fill="#1b2f5a" />
        <ellipse rx="6" ry="9" cy="-2" fill="#0f1a33" />
        <ellipse rx="3" ry="4" cx="-3" cy="-8" fill="#d9c3a0" opacity="0.8" />
      </g>
    </svg>
  );
});
