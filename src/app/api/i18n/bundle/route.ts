import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBundle, getEnabledLanguages } from "@/lib/i18n/server";
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE } from "@/lib/i18n/config";

/**
 * Lazy-load endpoint the I18nProvider calls to hydrate additional namespaces:
 *   GET /api/i18n/bundle?lang=<code>&ns=<name[,name...]>
 * Returns a Bundle ({ lang, version, values }) with English fallback baked in.
 * An unknown/disabled `lang` falls back to English rather than 401/404 so a
 * stale client preference never blanks the UI.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const nsList = (url.searchParams.get("ns") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Validate the requested language is actually enabled; otherwise serve English.
  const languages = await getEnabledLanguages();
  const lang = languages.some((l) => l.code === langParam) ? langParam : FALLBACK_LANGUAGE;

  const bundle = await getBundle(lang, nsList);

  return NextResponse.json(bundle, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=86400" },
  });
}
