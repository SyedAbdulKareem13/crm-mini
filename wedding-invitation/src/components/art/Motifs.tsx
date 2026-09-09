import { memo } from "react";

interface MotifProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Two interlocking rings with a small diamond — engagement */
export const RingsMotif = memo(function RingsMotif({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle data-draw cx="46" cy="66" r="26" />
      <circle data-draw cx="74" cy="66" r="26" />
      <circle data-draw cx="46" cy="66" r="20" opacity="0.5" strokeWidth="1" />
      <circle data-draw cx="74" cy="66" r="20" opacity="0.5" strokeWidth="1" />
      <path data-draw d="M74 40 l -8 -10 l 8 -10 l 8 10 z" />
      <path data-draw d="M66 30 h 16 M74 20 v 20" opacity="0.6" strokeWidth="1" />
    </svg>
  );
});

/** Lamp outline with flame — reception */
export const LampMotif = memo(function LampMotif({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse data-draw cx="60" cy="104" rx="26" ry="6" />
      <path data-draw d="M52 98 C 50 90 56 84 56 76 C 56 70 50 68 50 62 H 70 C 70 68 64 70 64 76 C 64 84 70 90 68 98" />
      <path data-draw d="M34 56 C 34 66 46 72 60 72 C 74 72 86 66 86 56 Z" />
      <path data-draw d="M30 54 L 38 48 M 90 54 L 82 48" />
      <path data-draw d="M60 24 C 68 34 70 42 60 50 C 50 42 52 34 60 24 Z" className="flame" style={{ transformOrigin: "60px 50px" }} />
      <path data-draw d="M60 34 C 63 38 63 44 60 47 C 57 44 57 38 60 34 Z" opacity="0.7" strokeWidth="1.2" />
    </svg>
  );
});

/** Small gopuram outline — wedding */
export const TempleMotif = memo(function TempleMotif({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path data-draw d="M18 104 H 102" />
      <path data-draw d="M26 104 V 84 H 94 V 104" />
      <path data-draw d="M32 84 L 38 66 H 82 L 88 84" />
      <path data-draw d="M40 66 L 45 50 H 75 L 80 66" />
      <path data-draw d="M46 50 C 46 36 52 30 60 30 C 68 30 74 36 74 50" />
      <path data-draw d="M60 30 V 20 M 52 32 V 24 M 68 32 V 24" />
      <path data-draw d="M60 20 l -3 6 h 6 z" />
      <path data-draw d="M54 104 V 92 A 6 6 0 0 1 66 92 V 104" />
      <path data-draw d="M52 76 v-5 a3 3 0 0 1 6 0 v5 M62 76 v-5 a3 3 0 0 1 6 0 v5" opacity="0.7" strokeWidth="1.2" />
    </svg>
  );
});

/** Symmetric scroll flourish used beside names. Mirror with scaleX(-1). */
export const Flourish = memo(function Flourish({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 200 60" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path data-draw d="M198 30 H 90 C 70 30 58 22 46 22 C 30 22 24 34 32 42 C 40 50 54 44 50 34 C 46 26 34 28 36 36" />
      <path data-draw d="M110 30 C 120 24 128 18 140 20 C 150 22 150 32 142 34 C 134 36 130 28 136 26" opacity="0.8" />
      <path data-draw d="M110 30 C 120 36 128 42 140 40 C 150 38 150 28 142 26 C 134 24 130 32 136 34" opacity="0.8" />
      <path data-draw d="M170 30 c-4 -6 -4 -10 0 -14 c4 4 4 8 0 14z M170 30 c-4 6 -4 10 0 14 c4 -4 4 -8 0 -14z" opacity="0.9" />
      <circle data-draw cx="60" cy="30" r="1.8" fill="currentColor" />
    </svg>
  );
});

/** Ornamental divider — rule with a lotus bud in the centre */
export const Divider = memo(function Divider({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 320 40" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path data-draw d="M0 20 H 128" opacity="0.7" />
      <path data-draw d="M192 20 H 320" opacity="0.7" />
      <path data-draw d="M160 8 C 168 14 168 24 160 32 C 152 24 152 14 160 8 Z" />
      <path data-draw d="M146 20 C 150 14 156 12 160 8 M 174 20 C 170 14 164 12 160 8" opacity="0.7" />
      <path data-draw d="M146 20 C 150 26 156 28 160 32 M 174 20 C 170 26 164 28 160 32" opacity="0.7" />
      <circle cx="136" cy="20" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="184" cy="20" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
});

/** Kalasam (auspicious pot) — a compact vertical ornament */
export const Kalasam = memo(function Kalasam({ className, style }: MotifProps) {
  return (
    <svg viewBox="0 0 60 100" className={className} style={style} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path data-draw d="M30 4 l -5 12 h 10 z" />
      <circle data-draw cx="30" cy="24" r="5" />
      <path data-draw d="M22 34 H 38 M 24 34 C 12 46 12 70 30 74 C 48 70 48 46 36 34" />
      <path data-draw d="M18 82 H 42 M 22 92 H 38" />
      <path data-draw d="M30 74 V 82" />
    </svg>
  );
});
