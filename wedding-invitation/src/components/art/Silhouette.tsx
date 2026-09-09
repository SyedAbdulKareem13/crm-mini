"use client";

import { useId } from "react";

/**
 * Paper-cut profile portraits for when there are no photographs.
 * Drawn in the ArchFrame's 300 × 430 coordinate space; the figure fills the
 * inner arch and the shoulders run off the bottom edge like a cameo.
 * Bride faces right, groom faces left — towards each other across the page.
 */

const BRIDE =
  "M44 400 L44 372 C70 350 110 330 134 306 C140 292 140 274 136 258 C118 252 96 240 88 222 " +
  "C62 226 52 200 66 182 C78 168 98 168 104 178 C96 150 104 122 128 110 C146 100 168 106 176 126 " +
  "C186 148 190 160 188 174 C186 180 190 186 196 194 C204 202 206 210 200 214 L192 216 " +
  "C196 222 198 228 194 232 C198 236 198 242 192 246 C194 254 192 262 184 268 C176 276 168 282 166 292 " +
  "C166 304 170 318 178 330 C200 342 232 354 256 372 L256 400 Z";

const GROOM =
  "M44 400 L44 366 C76 346 116 330 138 302 C142 290 142 276 138 262 C118 250 104 232 100 210 " +
  "C96 180 102 140 128 118 C146 104 172 108 182 126 C190 146 192 160 190 176 C188 182 192 188 198 196 " +
  "C208 206 208 214 200 218 L192 220 C198 226 198 232 194 236 C198 240 198 248 190 252 " +
  "C196 262 192 272 182 280 C174 288 168 294 168 302 C168 314 172 328 180 340 C206 352 236 360 256 372 L256 400 Z";

/** jasmine buds tucked along the kondai */
const JASMINE: Array<[number, number, number]> = [
  [112, 146, 4.2], [100, 156, 4.6], [90, 168, 4.6], [82, 182, 4.8], [78, 197, 4.8], [80, 212, 4.6], [88, 224, 4.4], [100, 232, 4.2], [112, 238, 3.8],
];

export function SilhouetteGroup({ variant }: { variant: "bride" | "groom" }) {
  const id = useId().replace(/:/g, "");
  const body = `sil-body-${id}`, halo = `sil-halo-${id}`, gold = `sil-gold-${id}`;

  const defs = (
    <defs>
      <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6a1526" />
        <stop offset="0.55" stopColor="#4a0d19" />
        <stop offset="1" stopColor="#2c0810" />
      </linearGradient>
      <radialGradient id={halo} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#e8cf8a" stopOpacity="0.55" />
        <stop offset="0.6" stopColor="#e8cf8a" stopOpacity="0.14" />
        <stop offset="1" stopColor="#e8cf8a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8e6a1f" />
        <stop offset="0.5" stopColor="#f0d58a" />
        <stop offset="1" stopColor="#b8913a" />
      </linearGradient>
    </defs>
  );

  if (variant === "bride") {
    return (
      <g data-figure>
        {defs}
        <circle cx="150" cy="215" r="118" fill={`url(#${halo})`} />
        <path d={BRIDE} fill={`url(#${body})`} stroke={`url(#${gold})`} strokeWidth="1.1" strokeLinejoin="round" />
        {/* saree pallu — zari borders across the shoulder */}
        <path d="M44 386 C 92 372 142 362 200 358 C 224 356 242 360 256 368" fill="none" stroke={`url(#${gold})`} strokeWidth="1.6" />
        <path d="M44 394 C 92 380 142 370 200 366 C 224 364 242 368 256 376" fill="none" stroke="#e8cf8a" strokeWidth="0.7" opacity="0.7" />
        {/* necklace with pendant */}
        <path d="M138 298 Q 160 342 194 330" fill="none" stroke={`url(#${gold})`} strokeWidth="1.4" />
        <path d="M168 340 l -4 -7 l 4 -5 l 4 5 z" fill="#f0d58a" />
        {/* ear + jhumka */}
        <path d="M150 198 c -8 -4 -12 6 -8 14 c 3 6 9 6 10 0" fill="none" stroke="#e8cf8a" strokeWidth="0.8" opacity="0.6" />
        <circle cx="151" cy="214" r="2.6" fill="#f0d58a" />
        <path d="M151 216 V 226" stroke="#f0d58a" strokeWidth="0.9" />
        <path d="M143 236 Q 151 222 159 236 Z" fill={`url(#${gold})`} />
        {[145, 149, 153, 157].map((x) => (
          <circle key={x} cx={x} cy="239" r="1.3" fill="#f0d58a" />
        ))}
        {/* nethi chutti, bindi, mookuthi */}
        <path d="M150 104 Q 166 108 178 124" fill="none" stroke="#f0d58a" strokeWidth="0.9" opacity="0.8" />
        <path d="M178 124 l -4 7 l 4 7 l 4 -7 z" fill="#f0d58a" />
        <circle cx="182" cy="166" r="2.6" fill="#c8431f" />
        <circle cx="201" cy="208" r="1.7" fill="#f0d58a" />
        {/* malligai along the kondai */}
        {JASMINE.map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {Array.from({ length: 5 }, (_, k) => (
              <ellipse key={k} cx="0" cy={-r * 0.9} rx={r * 0.42} ry={r * 0.95} transform={`rotate(${k * 72})`} fill="#fbf6ea" />
            ))}
            <circle r={r * 0.28} fill="#e8cf8a" />
          </g>
        ))}
      </g>
    );
  }

  return (
    <g data-figure>
      {defs}
      <circle cx="150" cy="215" r="118" fill={`url(#${halo})`} />
      <g transform="translate(300 0) scale(-1 1)">
        <path d={GROOM} fill={`url(#${body})`} stroke={`url(#${gold})`} strokeWidth="1.1" strokeLinejoin="round" />
        {/* angavastram across the shoulder */}
        <path d="M44 384 C 100 368 150 352 200 354 C 228 355 244 362 256 372" fill="none" stroke={`url(#${gold})`} strokeWidth="1.8" />
        <path d="M44 392 C 100 376 150 360 200 362 C 228 363 244 370 256 380" fill="none" stroke="#e8cf8a" strokeWidth="0.7" opacity="0.7" />
        <path d="M60 400 C 76 380 104 370 128 374" fill="none" stroke="#e8cf8a" strokeWidth="0.6" opacity="0.45" />
        {/* shirt collar */}
        <path d="M150 316 Q 172 350 198 336" fill="none" stroke="#e8cf8a" strokeWidth="0.9" opacity="0.65" />
        {/* ear */}
        <path d="M152 200 c -8 -4 -12 6 -8 14 c 3 6 9 6 10 0" fill="none" stroke="#e8cf8a" strokeWidth="0.8" opacity="0.6" />
        {/* hair sheen */}
        <path d="M128 124 C 146 112 166 114 178 130" fill="none" stroke="#e8cf8a" strokeWidth="0.8" opacity="0.35" />
        {/* thilakam */}
        <path d="M187 152 v 16" stroke="#c8431f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M187 150 v 20" stroke="#f0d58a" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
      </g>
    </g>
  );
}
