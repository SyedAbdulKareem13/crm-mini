"use client";

import { memo, useId } from "react";
import { SilhouetteGroup } from "./Silhouette";

export interface ArchFrameProps {
  className?: string;
  style?: React.CSSProperties;
  /** Big initial rendered when no photo is supplied */
  monogram: string;
  /** Optional portrait URL, clipped to the inner arch */
  photo?: string;
  alt?: string;
  /** Without a photo: a paper-cut profile of the bride or groom (falls back to the monogram) */
  figure?: "bride" | "groom";
}

const INNER = "M44 400 V196 C44 122 76 62 150 34 C224 62 256 122 256 196 V400 Z";
const OUTER = "M26 416 V196 C26 108 66 40 150 8 C234 40 274 108 274 196 V416";
const PAISLEY = "M0 0 c-13 -9 -17 -30 -6 -43 c8 -9 20 -8 24 2 c5 12 -4 26 -18 41 z";

/**
 * Temple-arch portrait frame. Strokes carry data-draw for reveal choreography.
 * Content inside the arch is SVG (image or monogram) so it clips responsively.
 */
export const ArchFrame = memo(function ArchFrame({ className, style, monogram, photo, alt = "", figure }: ArchFrameProps) {
  const id = useId().replace(/:/g, "");
  const clip = `arch-clip-${id}`, grad = `arch-grad-${id}`, mono = `arch-mono-${id}`;

  return (
    <svg viewBox="0 0 300 430" className={className} style={style} role={photo ? "img" : undefined} aria-label={photo ? alt : undefined} aria-hidden={photo ? undefined : true}>
      <defs>
        <clipPath id={clip}>
          <path d={INNER} />
        </clipPath>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6eedf" />
          <stop offset="1" stopColor="#ead9b8" />
        </linearGradient>
        <linearGradient id={mono} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8e6a1f" />
          <stop offset="0.5" stopColor="#d8b25e" />
          <stop offset="1" stopColor="#8e6a1f" />
        </linearGradient>
      </defs>

      {/* interior */}
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="300" height="430" fill={`url(#${grad})`} />
        {/* faint pulli grid */}
        {Array.from({ length: 12 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => (
            <circle key={`${r}-${c}`} cx={54 + c * 24} cy={70 + r * 28} r="1" fill="#8e6a1f" opacity="0.28" />
          )),
        )}
        {photo ? (
          <image href={photo} x="44" y="34" width="212" height="366" preserveAspectRatio="xMidYMid slice" />
        ) : figure ? (
          <>
            <g transform="translate(150 400) scale(1.06) translate(-150 -400)">
              <SilhouetteGroup variant={figure} />
            </g>
            {/* small monogram seal */}
            <circle cx={figure === "bride" ? 232 : 68} cy="78" r="17" fill="#f6eedf" stroke="#c9a24a" strokeWidth="1" data-draw />
            <text x={figure === "bride" ? 232 : 68} y="85" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600" fontSize="20" fill="#8e6a1f" data-monogram>
              {monogram}
            </text>
          </>
        ) : (
          <>
            <circle cx="150" cy="226" r="92" fill="none" stroke="#c9a24a" strokeOpacity="0.35" strokeWidth="1" data-draw />
            <circle cx="150" cy="226" r="78" fill="none" stroke="#c9a24a" strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="2 6" />
            <text
              x="150"
              y="268"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="500"
              fontSize="132"
              fill={`url(#${mono})`}
              data-monogram
            >
              {monogram}
            </text>
          </>
        )}
        {/* inner vignette */}
        <path d={INNER} fill="none" stroke="#2a1a14" strokeOpacity="0.12" strokeWidth="18" />
      </g>

      {/* frame strokes */}
      <g fill="none" stroke="#c9a24a" strokeLinecap="round" strokeLinejoin="round">
        <path d={INNER} strokeWidth="1.6" data-draw />
        <path d={OUTER} strokeWidth="2.2" data-draw />
        <path d="M18 416 H 282 M 30 426 H 270" strokeWidth="1.4" data-draw />
        {/* apex kalasam */}
        <path d="M150 8 V -2" strokeWidth="2" data-draw />
        <circle cx="150" cy="-4" r="3.5" strokeWidth="1.6" data-draw />
        {/* shoulder paisleys */}
        <path d={PAISLEY} transform="translate(46 150) rotate(-30)" strokeWidth="1.3" data-draw />
        <path d={PAISLEY} transform="translate(254 150) rotate(30) scale(-1 1)" strokeWidth="1.3" data-draw />
        {/* kudu niches along the arch */}
        {[-64, -36, 0, 36, 64].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x = 150 + Math.sin(rad) * 110;
          const y = 200 - Math.cos(rad) * 158;
          return <path key={a} d={`M${(x - 6).toFixed(1)} ${(y + 6).toFixed(1)} V ${y.toFixed(1)} A 6 6 0 0 1 ${(x + 6).toFixed(1)} ${y.toFixed(1)} V ${(y + 6).toFixed(1)}`} strokeWidth="1.1" data-draw opacity="0.9" />;
        })}
      </g>
    </svg>
  );
});
