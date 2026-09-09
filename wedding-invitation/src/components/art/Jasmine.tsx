import { memo } from "react";
import { seeded } from "@/lib/utils";

const f = (n: number) => n.toFixed(1);

export function JasmineFlower({ x, y, r = 1, rot = 0 }: { x: number; y: number; r?: number; rot?: number }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(r)})`}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-7" rx="3.4" ry="7.5" transform={`rotate(${i * 72})`} fill="#fbf6ea" stroke="#e6d6b0" strokeWidth="0.5" />
      ))}
      <circle r="1.8" fill="#e8cf8a" />
    </g>
  );
}

export function JasmineBud({ x, y, rot = 0, r = 1 }: { x: number; y: number; rot?: number; r?: number }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(r)})`}>
      <path d="M0 -10 C 4 -6 4 4 0 10 C -4 4 -4 -6 0 -10 Z" fill="#fbf6ea" stroke="#e6d6b0" strokeWidth="0.5" />
      <path d="M0 6 C 2 8 2 11 0 12 C -2 11 -2 8 0 6Z" fill="#7aa06b" />
    </g>
  );
}

export interface JasmineStrandProps {
  className?: string;
  style?: React.CSSProperties;
  /** number of flower nodes along the strand */
  count?: number;
  /** total drawn length in SVG units (width is 60) */
  length?: number;
}

/** A vertical malligai (jasmine) strand — alternating blooms and buds on a thread. */
export const JasmineStrand = memo(function JasmineStrand({ className, style, count = 14, length = 600 }: JasmineStrandProps) {
  const rnd = seeded(21);
  const step = length / count;
  return (
    <svg viewBox={`0 0 60 ${length}`} className={className} style={style} aria-hidden preserveAspectRatio="xMidYMin meet">
      <path d={`M30 0 V ${length}`} stroke="#c9a24a" strokeWidth="1.2" opacity="0.8" />
      {Array.from({ length: count }, (_, i) => {
        const y = step * (i + 0.5);
        const side = i % 2 ? 1 : -1;
        const jitter = (rnd() - 0.5) * 6;
        return (
          <g key={i}>
            <path d={`M30 ${f(y)} q ${side * 6} -4 ${side * 9} -2`} stroke="#7aa06b" strokeWidth="0.8" fill="none" />
            {i % 3 === 2 ? (
              <JasmineBud x={30 + side * 9} y={y - 4} rot={side * 30 + jitter} />
            ) : (
              <JasmineFlower x={30 + side * 10} y={y - 3} r={0.95 + rnd() * 0.2} rot={jitter * 4} />
            )}
            {i % 2 === 0 && <JasmineBud x={30 - side * 6} y={y + 8} rot={-side * 25} r={0.75} />}
          </g>
        );
      })}
    </svg>
  );
});
