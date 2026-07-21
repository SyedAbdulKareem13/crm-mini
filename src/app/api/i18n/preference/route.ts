import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEnabledLanguages, getUserLocalePreference, isFullModeAllowed } from "@/lib/i18n/server";
import { NO_SECONDARY } from "@/lib/i18n/config";

/**
 * The caller's stored locale preference. GET reads the normalized preference
 * (safe against gated/removed languages); PUT validates and persists a new
 * choice to Supabase so it restores across devices.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preference = await getUserLocalePreference(session.user.id);
  return NextResponse.json(preference);
}

const putSchema = z.object({
  uiLanguage: z.string().min(1),
  bilingualSecondary: z.string().min(1),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 }
    );
  }
  const { uiLanguage, bilingualSecondary } = parsed.data;

  // The primary must be allowed as the full UI language in this environment
  // (this enforces the production gate — a not-yet-approved full language can't
  // be selected as primary in production).
  const [allowedPrimary, languages] = await Promise.all([
    isFullModeAllowed(uiLanguage),
    getEnabledLanguages(),
  ]);
  if (!allowedPrimary) {
    return NextResponse.json(
      { error: "That language isn’t available as your interface language yet." },
      { status: 400 }
    );
  }

  // The secondary must be "none", or an enabled language usable as a secondary
  // script that differs from the primary.
  if (bilingualSecondary !== NO_SECONDARY) {
    const sec = languages.find((l) => l.code === bilingualSecondary);
    if (!sec || !sec.canBeSecondary) {
      return NextResponse.json(
        { error: "That secondary language isn’t available." },
        { status: 400 }
      );
    }
    if (bilingualSecondary === uiLanguage) {
      return NextResponse.json(
        { error: "The secondary language must differ from your interface language." },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { uiLanguage, bilingualSecondary },
  });

  return NextResponse.json({ uiLanguage, bilingualSecondary });
}
