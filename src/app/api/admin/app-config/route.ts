import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getHeroVersion, setHeroVersion } from "@/lib/app-config";

const patchSchema = z.object({
  heroVersion: z.enum(["v1", "v2"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const heroVersion = await getHeroVersion();
  return NextResponse.json({ heroVersion });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const heroVersion = await setHeroVersion(parsed.data.heroVersion);
  return NextResponse.json({ heroVersion });
}
