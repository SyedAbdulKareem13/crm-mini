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

/** miniature shrine (kuta) that sits on a cornice */
function Kuta({ x, y, w = 18, id }: { x: number; y: number; w?: number; id: string }) {
  const h = w * 0.55;
  const r = w / 2;
  return (
    <g key={id}>
      <path data-draw d={`M ${f(x - r)} ${f(y)} V ${f(y - h)} H ${f(x + r)} V ${f(y)}`} />
      <path data-draw d={`M ${f(x - r)} ${f(y - h)} A ${f(r)} ${f(r * 0.8)} 0 0 1 ${f(x + r)} ${f(y - h)}`} />
      <path data-draw d={`M ${f(x)} ${f(y - h - r * 0.8)} v -6`} />
      <circle data-draw cx={f(x)} cy={f(y - h - r * 0.8 - 8)} r="1.8" />
    </g>
  );
}

/**
 * Dravidian gopuram — six stepped talas with kudu niches, pilasters, corner kutas and a central
 * panjara on every tier; a barrel-vault sala with scalloped eaves, a nasi gable and a row of
 * kalasams; a pillared base with a double door, guardian niches, a staircase and lamp posts.
 * Line variant is drawable (data-draw).
 */
export function GopuramSvg({ className, style, variant = "line", strokeWidth = 1.5 }: GopuramProps) {
  const cx = 300;
  const T = tiers();
  const top = T[T.length - 1];
  const isLine = variant === "line";
  const salaTop = top.yTop - 112;

  const outline: string[] = [];
  outline.push(`M 20 660 L 20 640 L 40 640 L 40 560`);
  for (const t of T) {
    outline.push(`L ${f(cx - t.wBottom / 2)} ${f(t.yBottom)} L ${f(cx - t.wBottom / 2 - 8)} ${f(t.yBottom - 10)} L ${f(cx - t.wTop / 2 - 8)} ${f(t.yTop + 8)} L ${f(cx - t.wTop / 2)} ${f(t.yTop)}`);
  }
  outline.push(`L ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop - 80)} ${f(cx - 40)} ${f(salaTop)} ${cx} ${f(salaTop)}`);
  outline.push(`C ${f(cx + 40)} ${f(salaTop)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop - 80)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop)}`);
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
        {/* corner kutas add a little skyline texture to the distant tower */}
        {T.map((t, i) => (
          <g key={i} fill="#7a1b2e" fillOpacity="0.5">
            <rect x={f(cx - t.wTop / 2 - 4)} y={f(t.yTop - 12)} width="16" height="12" rx="6" />
            <rect x={f(cx + t.wTop / 2 - 12)} y={f(t.yTop - 12)} width="16" height="12" rx="6" />
          </g>
        ))}
        {kalasams.map((x) => (
          <path key={x} d={`M ${x} ${salaTop} v -14 l -4 -14 l 4 -8 l 4 8 l -4 14`} fill="#7a1b2e" fillOpacity="0.6" />
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
      {/* plinth, mouldings & steps */}
      <path data-draw d="M 20 660 H 580 M 40 640 H 560 M 60 620 H 540" />
      <path data-draw d="M 48 630 H 250 M 350 630 H 552" opacity="0.6" />
      <path data-draw d="M 32 650 H 262 M 338 650 H 568" opacity="0.6" />
      {/* central staircase with balustrades */}
      {[626, 633, 640, 647, 654].map((y, i) => (
        <path key={y} data-draw d={`M ${272 - i * 4} ${y} H ${328 + i * 4}`} opacity="0.9" />
      ))}
      <path data-draw d="M 268 620 C 256 634 252 646 250 660 M 332 620 C 344 634 348 646 350 660" />

      {/* base storey with pillars, capitals and bases */}
      <path data-draw d="M 40 560 H 560 V 620 H 40 Z" />
      {[90, 140, 190, 240, 360, 410, 460, 510].map((x) => (
        <g key={x}>
          <path data-draw d={`M ${x} 566 V 614`} opacity="0.8" />
          <path data-draw d={`M ${x - 7} 566 H ${x + 7} M ${x - 5} 571 H ${x + 5} M ${x - 7} 614 H ${x + 7} M ${x - 5} 609 H ${x + 5}`} opacity="0.7" />
        </g>
      ))}
      {/* guardian (dwarapalaka) niches */}
      <path data-draw d="M 206 612 V 588 A 11 11 0 0 1 228 588 V 612 M 372 612 V 588 A 11 11 0 0 1 394 588 V 612" opacity="0.85" />
      <path data-draw d="M 217 594 v 12 M 383 594 v 12" opacity="0.6" />
      {/* double door in the entrance arch */}
      <path data-draw d="M 268 620 V 592 A 32 32 0 0 1 332 592 V 620" />
      <path data-draw d="M 282 620 V 596 A 18 18 0 0 1 318 596 V 620" opacity="0.7" />
      <path data-draw d="M 300 596 V 620" opacity="0.7" />
      <circle data-draw cx="295" cy="608" r="1.6" opacity="0.8" />
      <circle data-draw cx="305" cy="608" r="1.6" opacity="0.8" />
      {/* lintel band with lotus buds */}
      <path data-draw d="M 60 560 H 540" opacity="0.5" />
      {[120, 180, 300, 420, 480].map((x) => (
        <path key={x} data-draw d={`M ${x} 552 c -4 4 -4 8 0 12 c 4 -4 4 -8 0 -12 z`} opacity="0.7" />
      ))}

      {/* stepped talas */}
      {T.map((t, i) => {
        const gap = (t.wTop * 0.88) / t.niches;
        const start = cx - (t.wTop * 0.88) / 2 + gap / 2;
        const ny = t.yTop + (t.yBottom - t.yTop) * 0.62;
        const kutaW = 18 - i;
        return (
          <g key={i}>
            <path
              data-draw
              d={`M ${f(cx - t.wBottom / 2)} ${f(t.yBottom)} L ${f(cx - t.wTop / 2)} ${f(t.yTop)} H ${f(cx + t.wTop / 2)} L ${f(cx + t.wBottom / 2)} ${f(t.yBottom)} Z`}
            />
            {/* cornice band and base moulding */}
            <path data-draw d={`M ${f(cx - t.wTop / 2 - 8)} ${f(t.yTop + 8)} H ${f(cx + t.wTop / 2 + 8)}`} opacity="0.75" />
            <path data-draw d={`M ${f(cx - t.wBottom / 2 + 10)} ${f(t.yBottom - 7)} H ${f(cx + t.wBottom / 2 - 10)}`} opacity="0.5" />
            {/* kudu niches with pilasters between them */}
            {Array.from({ length: t.niches }, (_, j) => {
              const x = start + j * gap;
              return (
                <g key={j}>
                  <path data-draw d={`M ${f(x - 6)} ${f(ny)} V ${f(ny - 12)} A 6 6 0 0 1 ${f(x + 6)} ${f(ny - 12)} V ${f(ny)}`} opacity="0.9" />
                  <path data-draw d={`M ${f(x)} ${f(ny - 9)} v 7`} opacity="0.55" />
                  {j < t.niches - 1 && <path data-draw d={`M ${f(x + gap / 2)} ${f(ny - 18)} V ${f(ny + 4)}`} opacity="0.45" />}
                </g>
              );
            })}
            {/* corner kutas + central panjara on the cornice */}
            {Kuta({ id: `kl${i}`, x: cx - t.wTop / 2 + 4, y: t.yTop, w: kutaW })}
            {Kuta({ id: `kr${i}`, x: cx + t.wTop / 2 - 4, y: t.yTop, w: kutaW })}
            {Kuta({ id: `kc${i}`, x: cx, y: t.yTop, w: kutaW + 8 })}
          </g>
        );
      })}

      {/* sala (barrel vault) with scalloped eave, band and nasi gable */}
      <path
        data-draw
        d={`M ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 6)} ${f(top.yTop - 80)} ${f(cx - 40)} ${f(salaTop)} ${cx} ${f(salaTop)} C ${f(cx + 40)} ${f(salaTop)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop - 80)} ${f(cx + top.wTop / 2 - 6)} ${f(top.yTop)}`}
      />
      <path
        data-draw
        d={`M ${f(cx - top.wTop / 2 + 30)} ${f(top.yTop)} C ${f(cx - top.wTop / 2 + 30)} ${f(top.yTop - 56)} ${f(cx - 26)} ${f(top.yTop - 78)} ${cx} ${f(top.yTop - 78)} C ${f(cx + 26)} ${f(top.yTop - 78)} ${f(cx + top.wTop / 2 - 30)} ${f(top.yTop - 56)} ${f(cx + top.wTop / 2 - 30)} ${f(top.yTop)}`}
        opacity="0.7"
      />
      {Array.from({ length: 8 }, (_, k) => {
        const x = cx - 84 + k * 24;
        return <path key={k} data-draw d={`M ${x} ${f(top.yTop - 2)} a 12 8 0 0 1 24 0`} opacity="0.6" />;
      })}
      <path data-draw d={`M ${f(cx - 60)} ${f(top.yTop - 40)} H ${f(cx + 60)}`} opacity="0.5" />
      {/* nasi: the horseshoe gable with a kirtimukha */}
      <path data-draw d={`M ${f(cx - 22)} ${f(top.yTop - 8)} V ${f(top.yTop - 34)} A 22 22 0 0 1 ${f(cx + 22)} ${f(top.yTop - 34)} V ${f(top.yTop - 8)}`} />
      <path data-draw d={`M ${f(cx - 14)} ${f(top.yTop - 8)} V ${f(top.yTop - 32)} A 14 14 0 0 1 ${f(cx + 14)} ${f(top.yTop - 32)} V ${f(top.yTop - 8)}`} opacity="0.6" />
      <circle data-draw cx={cx} cy={f(top.yTop - 40)} r="5" />
      <path data-draw d={`M ${f(cx - 5)} ${f(top.yTop - 40)} c -6 -2 -8 -8 -4 -12 M ${f(cx + 5)} ${f(top.yTop - 40)} c 6 -2 8 -8 4 -12`} opacity="0.8" />
      {/* kalasams */}
      {kalasams.map((x) => (
        <g key={x}>
          <path data-draw d={`M ${x} ${salaTop} V ${salaTop - 16}`} />
          <circle data-draw cx={x} cy={salaTop - 22} r="4" />
          <path data-draw d={`M ${x} ${salaTop - 40} l -5 12 h 10 z`} />
        </g>
      ))}

      {/* flanking lamp posts (deepa stambham) */}
      {[26, 574].map((x) => (
        <g key={x}>
          <path data-draw d={`M ${x} 660 V 548`} />
          {[652, 626, 600, 574].map((y) => (
            <path key={y} data-draw d={`M ${x - 9} ${y} H ${x + 9}`} opacity="0.8" />
          ))}
          <path data-draw d={`M ${x - 5} 548 H ${x + 5}`} />
          <path data-draw className="flame" style={{ transformOrigin: `${x}px 546px` }} d={`M ${x} 528 C ${x + 5} 535 ${x + 5} 542 ${x} 546 C ${x - 5} 542 ${x - 5} 535 ${x} 528 Z`} />
        </g>
      ))}
    </svg>
  );
}

export const Gopuram = memo(GopuramSvg);
