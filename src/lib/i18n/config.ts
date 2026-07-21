/**
 * Localization config — CLIENT-SAFE (no prisma). Constants and pure helpers
 * shared by the server loader, the API routes, the provider and the UI.
 *
 * The system is data-driven: languages, their metadata and every translation
 * live in Supabase (see prisma models Language / TranslationNamespace /
 * TranslationKey / TranslationValue). Nothing here hard-codes a language's
 * existence — these are only defaults and the fixed namespace catalogue the
 * client may lazy-load. Adding a language is pure data (see LOCALIZATION.md).
 */

export type Dir = "ltr" | "rtl";
export const DEFAULT_LANGUAGE = "en";
export const FALLBACK_LANGUAGE = "en";
export const NO_SECONDARY = "none";

/** The full namespace catalogue. Adding a namespace is pure data + one entry
 *  here. The whole UI-string set is small (a few hundred short strings), so we
 *  server-hydrate ALL of them on first paint (see CORE_NAMESPACES) — this gives
 *  zero flash and removes any need for per-page loadNamespace() wiring. */
export const I18N_NAMESPACES = [
  "common",
  "nav",
  "settings",
  "chrome",
  "table",
  "filters",
  "stages",
  "dashboard",
  "leads",
  "opportunities",
  "pipeline",
  "rfqs",
  "quotations",
  "lifecycle",
] as const;
export type Namespace = (typeof I18N_NAMESPACES)[number];

/** Namespaces every page needs immediately (server-hydrated, no flash).
 *  Hydrating the full set is cheap here and guarantees complete coverage. */
export const CORE_NAMESPACES: Namespace[] = [...I18N_NAMESPACES];

/** localStorage cache key — version-scoped so a pack bump invalidates it. */
export const bundleCacheKey = (lang: string, ns: string, version: number) =>
  `manzil.i18n.${lang}.${ns}.v${version}`;

/** How long a client keeps a bundle before revalidating (ms). */
export const BUNDLE_TTL_MS = 1000 * 60 * 60 * 6; // 6h; version bump overrides

/** Interpolate {vars} into a translated string. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
