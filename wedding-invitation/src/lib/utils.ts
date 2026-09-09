export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Split text into user-perceived characters (safe for Tamil combining marks). */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (locale: string, opts: { granularity: "grapheme" }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    return Array.from(new Seg("ta", { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Deterministic pseudo-random (for stable SSR/CSR render of decorative positions). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
