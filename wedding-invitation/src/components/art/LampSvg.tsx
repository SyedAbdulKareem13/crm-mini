/* Hook-free kuthuvilakku artwork — shared by the client component and the server-rendered invitation card. */

export interface Lamp2DProps {
  className?: string;
  style?: React.CSSProperties;
  lit?: boolean;
  /** show only outline strokes (drawable) */
  outline?: boolean;
  /** warm pool of light on the floor beneath the base */
  glow?: boolean;
}

const SPOUTS = [
  { x: 52, s: 0.62, z: 0 },
  { x: 86, s: 0.84, z: 1 },
  { x: 120, s: 1, z: 2 },
  { x: 154, s: 0.84, z: 1 },
  { x: 188, s: 0.62, z: 0 },
];

/**
 * Kuthuvilakku — the five-wick brass lamp, side view, with a turned stem,
 * stepped base, oil bowl with etched rim and the annam (swan) finial.
 * Pure function (no hooks) so it can also be rendered into the invitation card.
 */
export function LampSvg({ id, className, style, lit = true, outline = false, glow = false }: Lamp2DProps & { id: string }) {
  const brass = `brass-${id}`, shade = `shade-${id}`, flame = `flame-${id}`, halo = `halo-${id}`, pool = `pool-${id}`, sheen = `sheen-${id}`;

  if (outline) {
    return (
      <svg viewBox="0 0 240 400" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <ellipse data-draw cx="120" cy="372" rx="78" ry="16" />
        <ellipse data-draw cx="120" cy="352" rx="58" ry="12" />
        <ellipse data-draw cx="120" cy="340" rx="40" ry="9" />
        <path data-draw d="M108 336 C104 318 114 306 114 292 C114 280 102 276 102 266 C102 254 114 250 114 240 L114 232 H126 L126 240 C126 250 138 254 138 266 C138 276 126 280 126 292 C126 306 136 318 132 336" />
        <ellipse data-draw cx="120" cy="230" rx="18" ry="7" />
        <path data-draw d="M44 214 C44 238 78 252 120 252 C162 252 196 238 196 214" />
        <ellipse data-draw cx="120" cy="214" rx="76" ry="12" />
        {SPOUTS.map((s) => (
          <path key={s.x} data-draw d={`M${s.x - 11} 212 Q${s.x} ${200 - 6 * s.s} ${s.x + 11} 212`} />
        ))}
        <path data-draw d="M120 214 V 122" />
        <ellipse data-draw cx="120" cy="200" rx="10" ry="4" />
        <ellipse data-draw cx="120" cy="150" rx="11" ry="4" />
        <path data-draw d="M108 118 C100 106 108 96 120 96 C130 96 136 102 136 110 C136 116 128 120 120 120 Z M128 100 C132 90 130 80 122 76 M108 116 C98 112 96 104 102 98" />
        <circle data-draw cx="120" cy="76" r="4" />
        {lit &&
          SPOUTS.map((s) => {
            const tip = 168 - 22 * s.s, base = 208 - 6 * s.s;
            return <path key={`f${s.x}`} data-draw className="flame" style={{ transformOrigin: `${s.x}px ${base}px` }} d={`M${s.x} ${tip} C${s.x + 8 * s.s} ${tip + 12 * s.s} ${s.x + 9 * s.s} ${base - 8} ${s.x} ${base} C${s.x - 9 * s.s} ${base - 8} ${s.x - 8 * s.s} ${tip + 12 * s.s} ${s.x} ${tip} Z`} />;
          })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 400" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={brass} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a3210" />
          <stop offset="0.22" stopColor="#b48b37" />
          <stop offset="0.48" stopColor="#f6dfa0" />
          <stop offset="0.62" stopColor="#d9b25e" />
          <stop offset="0.8" stopColor="#8f6a22" />
          <stop offset="1" stopColor="#3f2a0c" />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7c574" />
          <stop offset="0.6" stopColor="#8f6a22" />
          <stop offset="1" stopColor="#4a3210" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={flame} cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.3" stopColor="#ffd763" />
          <stop offset="0.68" stopColor="#ff8f24" stopOpacity="0.92" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={halo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb257" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#ff8f24" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ff8f24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={pool} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb257" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb257" stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && <ellipse cx="120" cy="378" rx="118" ry="22" fill={`url(#${pool})`} />}

      {/* stepped base */}
      <ellipse cx="120" cy="372" rx="78" ry="16" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="366" rx="78" ry="12" fill="#e3c273" opacity="0.28" />
      <path d="M42 372 A78 16 0 0 0 198 372" fill="none" stroke="#2c1c06" strokeWidth="1.2" opacity="0.5" />
      <ellipse cx="120" cy="352" rx="58" ry="12" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="347" rx="58" ry="9" fill="#e3c273" opacity="0.25" />
      <ellipse cx="120" cy="340" rx="40" ry="9" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="336" rx="40" ry="6" fill="#f6dfa0" opacity="0.2" />

      {/* turned stem */}
      <path d="M108 336 C104 318 114 306 114 292 C114 280 102 276 102 266 C102 254 114 250 114 240 L114 232 H126 L126 240 C126 250 138 254 138 266 C138 276 126 280 126 292 C126 306 136 318 132 336 Z" fill={`url(#${brass})`} />
      <path d="M116 336 C114 318 118 306 118 292 C118 280 114 276 114 266 C114 254 118 250 118 240 L118 232 H122" fill="none" stroke={`url(#${sheen})`} strokeWidth="6" opacity="0.6" />
      <ellipse cx="120" cy="300" rx="15" ry="4.5" fill={`url(#${brass})`} stroke="#2c1c06" strokeWidth="0.6" strokeOpacity="0.5" />
      <ellipse cx="120" cy="266" rx="21" ry="5.5" fill={`url(#${brass})`} stroke="#2c1c06" strokeWidth="0.6" strokeOpacity="0.5" />
      <ellipse cx="120" cy="240" rx="13" ry="4" fill={`url(#${brass})`} stroke="#2c1c06" strokeWidth="0.6" strokeOpacity="0.5" />
      <ellipse cx="120" cy="230" rx="18" ry="7" fill={`url(#${brass})`} />

      {/* oil bowl */}
      <path d="M44 214 C44 238 78 252 120 252 C162 252 196 238 196 214 Z" fill={`url(#${shade})`} />
      <path d="M60 228 Q120 246 180 228" fill="none" stroke="#3a2608" strokeWidth="0.9" opacity="0.45" />
      <path d="M52 220 Q120 238 188 220" fill="none" stroke="#f6dfa0" strokeWidth="0.7" opacity="0.35" />
      <ellipse cx="120" cy="214" rx="76" ry="12" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="214" rx="66" ry="8.5" fill="#2e1e05" opacity="0.85" />
      <path d="M70 212 Q120 204 170 212" fill="none" stroke="#f6dfa0" strokeWidth="1" opacity="0.28" />
      {/* spouts */}
      {SPOUTS.map((s) => (
        <path key={s.x} d={`M${s.x - 11} 213 Q${s.x} ${200 - 6 * s.s} ${s.x + 11} 213 Z`} fill="#e9cb7c" opacity={0.55 + s.z * 0.2} />
      ))}

      {/* central column & annam finial */}
      <rect x="117" y="118" width="6" height="96" fill="#c9a24a" />
      <rect x="119" y="118" width="1.6" height="96" fill="#f6dfa0" opacity="0.6" />
      <ellipse cx="120" cy="200" rx="10" ry="4" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="176" rx="8" ry="3.5" fill={`url(#${brass})`} />
      <ellipse cx="120" cy="150" rx="11" ry="4" fill={`url(#${brass})`} />
      <g fill={`url(#${brass})`}>
        <path d="M108 118 C100 106 108 96 120 96 C130 96 136 102 136 110 C136 116 128 120 120 120 Z" />
        <path d="M108 116 C98 112 96 104 102 98 C104 106 108 110 112 112 Z" />
        <path d="M126 100 C130 92 130 82 123 77 C120 75 117 77 117 80 C117 83 121 84 124 88 C126 91 126 95 126 100 Z" />
        <circle cx="121" cy="76" r="4.2" />
        <path d="M117 76 l -8 2 l 8 2 z" fill="#e9cb7c" />
      </g>
      <path d="M112 108 Q120 112 128 106" fill="none" stroke="#3a2608" strokeWidth="0.7" opacity="0.5" />

      {/* flames */}
      {lit &&
        SPOUTS.map((s, i) => {
          const tip = 168 - 22 * s.s, base = 208 - 6 * s.s;
          return (
            <g key={s.x} className={i % 2 ? "flame" : "flame-slow"} style={{ transformOrigin: `${s.x}px ${base}px`, animationDelay: `${i * 0.23}s` }}>
              <ellipse cx={s.x} cy={base - 16 * s.s} rx={20 * s.s} ry={26 * s.s} fill={`url(#${halo})`} />
              <path d={`M${s.x} ${tip} C${s.x + 8 * s.s} ${tip + 12 * s.s} ${s.x + 9 * s.s} ${base - 8} ${s.x} ${base} C${s.x - 9 * s.s} ${base - 8} ${s.x - 8 * s.s} ${tip + 12 * s.s} ${s.x} ${tip} Z`} fill={`url(#${flame})`} />
              <path d={`M${s.x} ${tip + 14 * s.s} C${s.x + 3.5 * s.s} ${tip + 20 * s.s} ${s.x + 4 * s.s} ${base - 7} ${s.x} ${base - 3} C${s.x - 4 * s.s} ${base - 7} ${s.x - 3.5 * s.s} ${tip + 20 * s.s} ${s.x} ${tip + 14 * s.s} Z`} fill="#fffbe6" opacity="0.9" />
            </g>
          );
        })}
    </svg>
  );
}
