/**
 * Localization server loader (imports prisma). Builds translation bundles with
 * English fallback, reads/validates the user's preference, and enforces the
 * production gate for full-UI languages (e.g. Arabic stays gated until its pack
 * is reviewed & approved — Language.productionReady).
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, NO_SECONDARY, type Dir } from "./config";
import type { Bundle, LanguageDTO, LocalePreference } from "./types";

const IS_PROD = process.env.VERCEL_ENV === "production";

function toDir(d: string): Dir {
  return d === "RTL" ? "rtl" : "ltr";
}

/** Languages a user may pick right now. Full-UI languages that aren't
 *  productionReady are still offered OUTSIDE production (dev/preview) so the
 *  pack can be exercised before sign-off; in production they're hidden until
 *  approved. Secondary (beside-headings) languages are always offerable. */
export async function getEnabledLanguages(): Promise<LanguageDTO[]> {
  const rows = await prisma.language.findMany({
    where: { enabled: true },
    orderBy: { position: "asc" },
  });
  return rows
    .map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      direction: toDir(l.direction),
      locale: l.locale,
      canBePrimary: l.canBePrimary,
      canBeSecondary: l.canBeSecondary,
      productionReady: l.productionReady,
    }))
    .filter((l) => {
      // In production, a not-yet-approved full-UI language is only usable as a
      // secondary script (never as the primary UI) until it's productionReady.
      if (IS_PROD && l.canBePrimary && !l.productionReady) {
        return l.canBeSecondary; // keep only if it still serves as secondary
      }
      return true;
    })
    .map((l) => ({
      ...l,
      // reflect the gate to the client so the selector disables full mode
      canBePrimary: l.canBePrimary && (!IS_PROD || l.productionReady),
    }));
}

/** True when a language may be the full UI language in the current environment. */
export async function isFullModeAllowed(code: string): Promise<boolean> {
  if (code === DEFAULT_LANGUAGE) return true;
  const l = await prisma.language.findUnique({ where: { code } });
  if (!l || !l.enabled || !l.canBePrimary) return false;
  return !IS_PROD || l.productionReady;
}

/** The user's stored preference, validated against currently-allowed languages
 *  (falls back safely so a gated/removed language never breaks the UI). */
export async function getUserLocalePreference(userId: string): Promise<LocalePreference> {
  const [user, langs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { uiLanguage: true, bilingualSecondary: true },
    }),
    getEnabledLanguages(),
  ]);
  const byCode = new Map(langs.map((l) => [l.code, l]));

  let uiLanguage = user?.uiLanguage ?? DEFAULT_LANGUAGE;
  const primary = byCode.get(uiLanguage);
  if (!primary || !primary.canBePrimary) uiLanguage = DEFAULT_LANGUAGE;

  let bilingualSecondary = user?.bilingualSecondary ?? NO_SECONDARY;
  if (bilingualSecondary !== NO_SECONDARY) {
    const sec = byCode.get(bilingualSecondary);
    if (!sec || !sec.canBeSecondary || bilingualSecondary === uiLanguage) {
      bilingualSecondary = NO_SECONDARY;
    }
  }
  return { uiLanguage, bilingualSecondary };
}

export async function resolveDirection(code: string): Promise<Dir> {
  const l = await prisma.language.findUnique({ where: { code }, select: { direction: true } });
  return toDir(l?.direction ?? "LTR");
}

/**
 * Build a "ns.key" -> value map for a language across the requested
 * namespaces. English is always merged first as the fallback, then the target
 * language's usable values overlay it. A value is usable when APPROVED, or
 * MACHINE_DRAFT / PENDING_REVIEW outside production (so drafts are testable on
 * dev but never leak to production).
 */
export async function getBundle(lang: string, namespaces: string[]): Promise<Bundle> {
  const nsRows = await prisma.translationNamespace.findMany({
    where: { name: { in: namespaces } },
    select: { id: true, name: true, version: true },
  });
  if (nsRows.length === 0) return { lang, version: 1, values: {} };
  const nsById = new Map(nsRows.map((n) => [n.id, n.name]));

  const keys = await prisma.translationKey.findMany({
    where: { namespaceId: { in: nsRows.map((n) => n.id) } },
    select: {
      id: true,
      namespaceId: true,
      key: true,
      sourceText: true,
      values: {
        where: { languageCode: { in: [lang, FALLBACK_LANGUAGE] } },
        select: { languageCode: true, value: true, status: true },
      },
    },
  });

  const usable = (status: string) =>
    status === "APPROVED" || (!IS_PROD && (status === "MACHINE_DRAFT" || status === "PENDING_REVIEW"));

  const values: Record<string, string> = {};
  for (const k of keys) {
    const nsName = nsById.get(k.namespaceId)!;
    const full = `${nsName}.${k.key}`;
    // English fallback = the key's own sourceText, or its 'en' value.
    let out = k.sourceText;
    const en = k.values.find((v) => v.languageCode === FALLBACK_LANGUAGE);
    if (en) out = en.value;
    if (lang !== FALLBACK_LANGUAGE) {
      const target = k.values.find((v) => v.languageCode === lang);
      if (target && usable(target.status)) out = target.value;
    }
    values[full] = out;
  }

  const version = Math.max(1, ...nsRows.map((n) => n.version));
  return { lang, version, values };
}
