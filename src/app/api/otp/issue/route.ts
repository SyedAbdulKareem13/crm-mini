import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().min(3),
  channel: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
  purpose: z.enum(["signup", "reset", "login"]).optional(),
});

const PURPOSE_TEXT = {
  signup: "verify your email",
  reset: "reset your password",
  login: "sign in",
} as const;

/** Emails compare case-insensitively; stray whitespace never invalidates a code. */
const normalizeIdentifier = (s: string) => (s.includes("@") ? s.trim().toLowerCase() : s.trim());

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const identifier = normalizeIdentifier(parsed.data.identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { mobile: identifier }],
    },
    select: { id: true, isActive: true },
  });
  // Sign-in and reset codes are only meaningful for existing accounts — say
  // so clearly instead of letting verification fail with a confusing
  // "invalid code" later. (Signup legitimately targets brand-new emails.)
  if (parsed.data.purpose !== "signup") {
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email or mobile." },
        { status: 404 }
      );
    }
    if (user.isActive === false) {
      return NextResponse.json(
        { error: "This account is deactivated — contact your admin." },
        { status: 403 }
      );
    }
  }
  const result = await issueOtp({
    identifier,
    channel: parsed.data.channel,
    userId: user?.id ?? null,
    purpose: parsed.data.purpose ? PURPOSE_TEXT[parsed.data.purpose] : undefined,
  });
  // With a real email provider: code is emailed (code=null, delivered=true).
  // Without one: code is returned so the form can show it (dev / demo).
  return NextResponse.json({
    ok: true,
    mock: result.mock,
    code: result.code,
    delivered: result.delivered,
  });
}
