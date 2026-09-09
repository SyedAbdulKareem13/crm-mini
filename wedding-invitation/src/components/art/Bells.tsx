"use client";

import { memo, useId } from "react";

export interface BellProps {
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

/** Temple bell on a chain; swings with the .sway keyframe. */
export const Bell = memo(function Bell({ className, style, delay = 0 }: BellProps) {
  const id = useId().replace(/:/g, "");
  const brass = `bell-${id}`;
  return (
    <svg viewBox="0 0 100 190" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={brass} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c4212" />
          <stop offset="0.3" stopColor="#b8913a" />
          <stop offset="0.5" stopColor="#f0d58a" />
          <stop offset="0.75" stopColor="#b8913a" />
          <stop offset="1" stopColor="#5c4212" />
        </linearGradient>
      </defs>
      <g className="sway" style={{ animationDelay: `-${delay}s`, animationDuration: "6.5s", transformOrigin: "50px 0px" }}>
        <path d="M50 0 V 40" stroke="#c9a24a" strokeWidth="2" />
        {[8, 18, 28].map((y) => (
          <circle key={y} cx="50" cy={y} r="2.6" fill="#e3c273" />
        ))}
        <circle cx="50" cy="46" r="7" fill={`url(#${brass})`} />
        <path d="M50 50 C 32 50 30 84 24 124 L 76 124 C 70 84 68 50 50 50 Z" fill={`url(#${brass})`} />
        <path d="M30 100 Q50 92 70 100" stroke="#5c4212" strokeWidth="1" fill="none" opacity="0.7" />
        <ellipse cx="50" cy="126" rx="29" ry="7" fill="#8e6a1f" />
        <ellipse cx="50" cy="124" rx="29" ry="6" fill={`url(#${brass})`} />
        <path d="M50 118 V 138" stroke="#6b4d16" strokeWidth="2" />
        <circle cx="50" cy="142" r="6" fill={`url(#${brass})`} />
      </g>
    </svg>
  );
});
