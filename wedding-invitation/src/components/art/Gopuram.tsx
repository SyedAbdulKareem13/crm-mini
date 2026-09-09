import { memo } from "react";

const f = (n: number) => n.toFixed(1);

interface Tier {
  yTop: number;
  yBottom: number;
  wTop: number;
  wBottom: number;
  niches: number;
}

function tiers(): Tier[] {
  const out: Tier[] = [];
  const count = 6;
  let yBottom = 560;
  for (let i = 0; i < count; i++) {
    const h = 66 - i * 3;
    const wBottom = 440 - i * 40;
    const wTop = wBottom - 34;
    out.push({ yTop: yBottom - h, yBottom, wTop, wBottom, niches: 9 - i });
    yBottom -= h;
  }
  return out;
}

export interface GopuramProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "line" | "silhouette";
  strokeWidth?: number;
}

/**
 * Dravidian gopuram — six stepped talas, kudu niches, barrel-vault sala
 * and a row of kalasams. Line variant is drawable (data-draw).
 */
export const Gopuram = memo(function Gopuram({ className, style, variant = "line", strokeWidth = 1.5 }: GopuramProps) {
  const cx = 300;
  const T = tiers();
  const top = T[T.length - 1];
  const isLine = variant === "line";

  const outline: string[] = [];
  // outline for silhouette: walk up left side, across the sala, down the right
  outline.push(`M 20 660 L 20 640 L 40 640 L 40 560`);
  for (const t of T) {
    outline.push(`L ${f(cx - t.wBottom / 2)} ${f(t.yBottom)} L ${f(cx - t.wBottom / 2 - 8)} ${f(t.yBottom - 10)} L ${f(cx - t.wTop / 2 - 8)} ${f(t.yTop + 8)} L ${f(cx - t.wTop / 2)} ${f(t.yTop)}`);
  }
  outline.push(`L ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop - 80)} ${f(cx - 40)} ${f(top.yTop - 112)} ${cx} ${f(top.yTop - 112)}`);
  outline.push(`C ${f(cx + 40)} ${f(top.yTop - 112)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop - 80)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop)}`);
  for (const t of [...T].reverse()) {
    outline.push(`L ${f(cx + t.wTop / 2)} ${f(t.yTop)} L ${f(cx + t.wTop / 2 + 8)} ${f(t.yTop + 8)} L ${f(cx + t.wBottom / 2 + 8)} ${f(t.yBottom - 10)} L ${f(cx + t.wBottom / 2)} ${f(t.yBottom)}`);
  }
  outline.push(`L 560 560 L 560 640 L 580 640 L 580 660 Z`);
  const silhouette = outline.join(" ");

  const kalasams = Array.from({ length: 7 }, (_, i) => cx - 90 + i * 30);

  if (!isLine) {
    return (
      <svg viewBox="0 0 600 680" className={className} style={style} aria-hidden>
        <defs>
          <linearGradient id="gopuram-sil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a1b2e" stopOpacity="0.55" />
            <stop offset="1" stopColor="#120507" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d={silhouette} fill="url(#gopuram-sil)" />
        {kalasams.map((x) => (
          <path key={x} d={`M ${x} ${top.yTop - 112} v -14 l -4 -14 l 4 -8 l 4 8 l -4 14`} fill="#7a1b2e" fillOpacity="0.6" />
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 600 680"
      className={className}
      style={style}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* plinth & steps */}
      <path data-draw d="M 20 660 H 580 M 40 640 H 560 M 60 620 H 540" />
      {/* base storey with pillars and entrance */}
      <path data-draw d="M 40 560 H 560 V 620 H 40 Z" />
      {[90, 140, 190, 240, 360, 410, 460, 510].map((x) => (
        <path key={x} data-draw d={`M ${x} 566 V 614`} opacity="0.8" />
      ))}
      <path data-draw d="M 268 620 V 592 A 32 32 0 0 1 332 592 V 620" />
      <path data-draw d="M 282 620 V 596 A 18 18 0 0 1 318 596 V 620" opacity="0.7" />

      {/* stepped talas */}
      {T.map((t, i) => {
        const gap = (t.wTop * 0.88) / t.niches;
        const start = cx - (t.wTop * 0.88) / 2 + gap / 2;
        const ny = t.yTop + (t.yBottom - t.yTop) * 0.62;
        return (
          <g key={i}>
            <path
              data-draw
              d={`M ${f(cx - t.wBottom / 2)} ${f(t.yBottom)} L ${f(cx - t.wTop / 2)} ${f(t.yTop)} H ${f(cx + t.wTop / 2)} L ${f(cx + t.wBottom / 2)} ${f(t.yBottom)} Z`}
            />
            {/* cornice band */}
            <path data-draw d={`M ${f(cx - t.wTop / 2 - 8)} ${f(t.yTop + 8)} H ${f(cx + t.wTop / 2 + 8)}`} opacity="0.75" />
            {/* kudu niches */}
            {Array.from({ length: t.niches }, (_, j) => {
              const x = start + j * gap;
              return <path key={j} data-draw d={`M ${f(x - 6)} ${f(ny)} V ${f(ny - 12)} A 6 6 0 0 1 ${f(x + 6)} ${f(ny - 12)} V ${f(ny)}`} opacity="0.9" />;
            })}
          </g>
        );
      })}

      {/* sala (barrel vault) */}
      <path
        data-draw
        d={`M ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop - 80)} ${f(cx - 40)} ${f(top.yTop - 112)} ${cx} ${f(top.yTop - 112)} C ${f(cx + 40)} ${f(top.yTop - 112)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop - 80)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop)}`}
      />
      <path
        data-draw
        d={`M ${f(cx - top.wTop / 2 + 30)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 30)} ${f(top.yTop - 56)} ${f(cx - 26)} ${f(top.yTop - 78)} ${cx} ${f(top.yTop - 78)} C ${f(cx + 26)} ${f(top.yTop - 78)} ${f(cx + top.wTop / 2 - 30)} ${f(top.yTop - 56)} ${f(cx + top.wTop / 2 - 30)} ${f(top.yTop)}`}
        opacity="0.7"
      />
      {/* kalasams */}
      {kalasams.map((x) => (
        <g key={x}>
          <path data-draw d={`M ${x} ${top.yTop - 112} V ${top.yTop - 128}`} />
          <circle data-draw cx={x} cy={top.yTop - 134} r="4" />
          <path data-draw d={`M ${x} ${top.yTop - 152} l -5 12 h 10 z`} />
        </g>
      ))}
    </svg>
  );
});
