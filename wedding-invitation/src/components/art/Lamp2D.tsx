"use client";

import { memo, useId } from "react";

export interface Lamp2DProps {
  className?: string;
  style?: React.CSSProperties;
  lit?: boolean;
  /** show only outline strokes (drawable) */
  outline?: boolean;
}

/** Kuthuvilakku — the five-wick brass lamp, side view. */
export const Lamp2D = memo(function Lamp2D({ className, style, lit = true, outline = false }: Lamp2DProps) {
  const id = useId().replace(/:/g, "");
  const brass = `brass-${id}`, flame = `flame-${id}`, glow = `glow-${id}`, shade = `shade-${id}`;

  const spouts = [
    { x: 46, s: 0.7, z: 0 },
    { x: 73, s: 0.85, z: 1 },
    { x: 100, s: 1, z: 2 },
    { x: 127, s: 0.85, z: 1 },
    { x: 154, s: 0.7, z: 0 },
  ];

  if (outline) {
    return (
      <svg viewBox="0 0 200 320" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <ellipse data-draw cx="100" cy="298" rx="60" ry="13" />
        <ellipse data-draw cx="100" cy="285" rx="42" ry="9" />
        <path data-draw d="M92 279 C88 262 97 252 97 238 C97 226 86 221 86 210 C86 199 97 195 97 185 H103 C103 195 114 199 114 210 C114 221 103 226 103 238 C103 252 112 262 108 279" />
        <ellipse data-draw cx="100" cy="183" rx="15" ry="6" />
        <path data-draw d="M40 168 C40 188 68 200 100 200 C132 200 160 188 160 168" />
        <ellipse data-draw cx="100" cy="168" rx="60" ry="10" />
        {spouts.map((s) => (
          <path key={s.x} data-draw d={`M${s.x - 9} 166 L${s.x} ${166 - 8 * s.s} L${s.x + 9} 166`} />
        ))}
        <path data-draw d="M100 158 V 128" />
        <circle data-draw cx="100" cy="146" r="4" />
        <circle data-draw cx="100" cy="135" r="3" />
        <path data-draw d="M100 116 l -6 12 h 12 z" />
        {lit &&
          spouts.map((s) => (
            <path key={`f${s.x}`} data-draw className="flame" style={{ transformOrigin: `${s.x}px ${162 - 8 * s.s}px` }} d={`M${s.x} ${136 - 10 * s.s} C${s.x + 7 * s.s} ${146 - 6 * s.s} ${s.x + 8 * s.s} ${156} ${s.x} ${162 - 8 * s.s} C${s.x - 8 * s.s} ${156} ${s.x - 7 * s.s} ${146 - 6 * s.s} ${s.x} ${136 - 10 * s.s} Z`} />
          ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 320" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={brass} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c4212" />
          <stop offset="0.25" stopColor="#b8913a" />
          <stop offset="0.5" stopColor="#f0d58a" />
          <stop offset="0.75" stopColor="#b8913a" />
          <stop offset="1" stopColor="#5c4212" />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0d58a" />
          <stop offset="1" stopColor="#6b4d16" />
        </linearGradient>
        <radialGradient id={flame} cx="0.5" cy="0.75" r="0.6">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.35" stopColor="#ffd25a" />
          <stop offset="0.7" stopColor="#ff8a1f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <filter id={glow} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* base */}
      <ellipse cx="100" cy="298" rx="60" ry="13" fill={`url(#${brass})`} />
      <ellipse cx="100" cy="292" rx="60" ry="10" fill="#f0d58a" opacity="0.25" />
      <ellipse cx="100" cy="285" rx="42" ry="9" fill={`url(#${brass})`} />
      {/* stem */}
      <path d="M92 279 C88 262 97 252 97 238 C97 226 86 221 86 210 C86 199 97 195 97 185 H103 C103 195 114 199 114 210 C114 221 103 226 103 238 C103 252 112 262 108 279 Z" fill={`url(#${brass})`} />
      <ellipse cx="100" cy="183" rx="15" ry="6" fill={`url(#${brass})`} />
      {/* bowl */}
      <path d="M40 168 C40 188 68 200 100 200 C132 200 160 188 160 168 Z" fill={`url(#${shade})`} />
      <ellipse cx="100" cy="168" rx="60" ry="10" fill={`url(#${brass})`} />
      <ellipse cx="100" cy="168" rx="52" ry="7" fill="#3a2a0a" opacity="0.65" />
      {/* spouts */}
      {spouts.map((s) => (
        <path key={s.x} d={`M${s.x - 10} 167 L${s.x} ${166 - 8 * s.s} L${s.x + 10} 167 Z`} fill="#e3c273" opacity={0.6 + s.z * 0.15} />
      ))}
      {/* finial */}
      <path d="M99 160 V 128 H101 V160 Z" fill="#c9a24a" />
      <circle cx="100" cy="146" r="4" fill={`url(#${brass})`} />
      <circle cx="100" cy="135" r="3" fill={`url(#${brass})`} />
      <path d="M100 116 l -6 12 h 12 z" fill="#e3c273" />

      {/* flames */}
      {lit &&
        spouts.map((s, i) => {
          const tipY = 136 - 10 * s.s;
          const baseY = 162 - 8 * s.s;
          const d = `M${s.x} ${tipY} C${s.x + 7 * s.s} ${tipY + 10} ${s.x + 8 * s.s} ${baseY - 6} ${s.x} ${baseY} C${s.x - 8 * s.s} ${baseY - 6} ${s.x - 7 * s.s} ${tipY + 10} ${s.x} ${tipY} Z`;
          return (
            <g key={s.x} className={i % 2 ? "flame" : "flame-slow"} style={{ transformOrigin: `${s.x}px ${baseY}px`, animationDelay: `${i * 0.23}s` }}>
              <ellipse cx={s.x} cy={baseY - 10} rx={14 * s.s} ry={20 * s.s} fill="#ff9f2f" opacity="0.35" filter={`url(#${glow})`} />
              <path d={d} fill={`url(#${flame})`} />
              <path d={`M${s.x} ${tipY + 12} C${s.x + 3 * s.s} ${tipY + 18} ${s.x + 3.5 * s.s} ${baseY - 6} ${s.x} ${baseY - 2} C${s.x - 3.5 * s.s} ${baseY - 6} ${s.x - 3 * s.s} ${tipY + 18} ${s.x} ${tipY + 12} Z`} fill="#fff7d6" opacity="0.9" />
            </g>
          );
        })}
    </svg>
  );
});
