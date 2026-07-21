import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/i18n/server";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/config";

/**
 * The languages a user may pick right now (production gate applied server-side)
 * plus the app default. Used by the language selector in settings.
 *   GET /api/i18n/languages -> { languages: LanguageDTO[], default: "en" }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const languages = await getEnabledLanguages();

  return NextResponse.json(
    { languages, default: DEFAULT_LANGUAGE },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
