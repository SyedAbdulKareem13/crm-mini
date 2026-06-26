import { prisma } from "@/lib/prisma";

export type HeroVersion = "v1" | "v2";

const SINGLETON_ID = "singleton";

/**
 * Reads the global hero version for the public landing page.
 * Falls back to "v1" if the config row is missing or the DB is unreachable,
 * so the landing never breaks on a cold/empty database.
 */
export async function getHeroVersion(): Promise<HeroVersion> {
  try {
    const cfg = await prisma.appConfig.findUnique({
      where: { id: SINGLETON_ID },
      select: { heroVersion: true },
    });
    return cfg?.heroVersion === "v2" ? "v2" : "v1";
  } catch {
    return "v1";
  }
}

/** Upserts the singleton hero version. */
export async function setHeroVersion(version: HeroVersion): Promise<HeroVersion> {
  const cfg = await prisma.appConfig.upsert({
    where: { id: SINGLETON_ID },
    update: { heroVersion: version },
    create: { id: SINGLETON_ID, heroVersion: version },
    select: { heroVersion: true },
  });
  return cfg.heroVersion === "v2" ? "v2" : "v1";
}

/**
 * Gemini API key — read from Supabase (AppConfig.geminiApiKey) first so it can
 * be rotated without a redeploy, falling back to the GEMINI_API_KEY env var.
 * SERVER-ONLY: never return this to the client.
 */
export async function getGeminiKey(): Promise<string | null> {
  try {
    const cfg = await prisma.appConfig.findUnique({
      where: { id: SINGLETON_ID },
      select: { geminiApiKey: true },
    });
    return cfg?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
  } catch {
    return process.env.GEMINI_API_KEY?.trim() || null;
  }
}

/** Gemini model — DB config, then env, then a sensible default. */
export async function getGeminiModel(): Promise<string> {
  try {
    const cfg = await prisma.appConfig.findUnique({
      where: { id: SINGLETON_ID },
      select: { geminiModel: true },
    });
    return cfg?.geminiModel?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  } catch {
    return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  }
}

/** Store/rotate the Gemini key (admin). Pass null to clear. */
export async function setGeminiKey(key: string | null): Promise<void> {
  await prisma.appConfig.upsert({
    where: { id: SINGLETON_ID },
    update: { geminiApiKey: key },
    create: { id: SINGLETON_ID, geminiApiKey: key },
  });
}
