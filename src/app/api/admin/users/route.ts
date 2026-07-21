import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * Admin → Users management (onboarding + role/active changes).
 *
 * NOTE on auditing: recordAudit's AuditInput.entityType is a closed union
 * (LEAD | OPPORTUNITY | QUOTATION | RFQ | PROJECT) with no USER member, and it
 * does not accept arbitrary strings. Rather than widen src/lib/audit.ts (out of
 * scope for this agent), user onboarding / role changes are intentionally NOT
 * written to the CRM audit log here — documented for a follow-up if a USER
 * entityType is ever added to the union.
 */

// The active taxonomy (mirrors ACTIVE_ROLES in @/lib/permissions; legacy enum
// values are never offered for new assignments).
const ROLES = [
  "SUPER_USER",
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_OWNER",
  "SALES_HEAD",
  "BUSINESS_HEAD",
  "FINANCE_ANALYST",
  "FINANCE_HEAD",
] as const;
const roleEnum = z.enum(ROLES);

const onboardSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  role: roleEnum,
});

const patchSchema = z.object({
  id: z.string().min(1),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
});

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

// Unambiguous alphabet (no 0/O, 1/l/I) — safe to read aloud or copy by hand.
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%*+=?";
function generateTempPassword(length = 16): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  return out;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only the Super Admin can manage access." }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    select: USER_SELECT,
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only the Super Admin can manage access." }, { status: 403 });
  const orgId = session.user.organizationId;

  const body = await req.json().catch(() => null);
  const parsed = onboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, role } = parsed.data;

  // Email is globally unique in the schema.
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const tempPassword = generateTempPassword(16);
  // Match signup exactly: bcryptjs, 12 salt rounds.
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role as UserRole,
      organizationId: orgId,
      passwordHash,
      emailVerified: new Date(), // admin vouches for the address
      isActive: true,
      mustChangePassword: true,
    },
    select: USER_SELECT,
  });

  // Returned exactly once — never persisted or shown again.
  return NextResponse.json({ user, tempPassword });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only the Super Admin can manage access." }, { status: 403 });
  const orgId = session.user.organizationId;
  const selfId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { id, role, isActive } = parsed.data;
  if (role === undefined && isActive === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Multi-tenant guard: target must belong to the same org.
  const target = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Self-guards.
  if (id === selfId && role !== undefined && role !== target.role) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }
  if (id === selfId && isActive === false) {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }

  // Last-super-admin guard: never let the org lose its final access manager.
  const demotingFromSuperAdmin =
    role !== undefined && target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN";
  const deactivatingSuperAdmin =
    isActive === false && target.isActive && target.role === "SUPER_ADMIN";
  if (demotingFromSuperAdmin || deactivatingSuperAdmin) {
    const activeSuperAdmins = await prisma.user.count({
      where: { organizationId: orgId, role: "SUPER_ADMIN", isActive: true },
    });
    if (activeSuperAdmins <= 1) {
      return NextResponse.json(
        { error: "This is the last active Super Admin — assign another Super Admin first." },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(role !== undefined ? { role: role as UserRole } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: USER_SELECT,
  });
  return NextResponse.json({ user });
}
