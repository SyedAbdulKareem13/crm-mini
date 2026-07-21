import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureRolePermissions,
  PERMISSION_MODULES,
  type ModulePermissions,
} from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

// Active taxonomy (mirrors ACTIVE_ROLES in @/lib/permissions).
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

const MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key) as [string, ...string[]];

const PERMISSION_FIELDS = [
  "canRead",
  "canCreate",
  "canUpdate",
  "canDelete",
  "canCancel",
  "canReopen",
  "canApprove",
] as const;

const patchSchema = z.object({
  role: z.enum(ROLES),
  module: z.enum(MODULE_KEYS),
  field: z.enum(PERMISSION_FIELDS),
  value: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only the Super Admin can manage access." }, { status: 403 });
  const orgId = session.user.organizationId;

  await ensureRolePermissions(orgId);
  const rows = await prisma.rolePermission.findMany({ where: { organizationId: orgId } });

  // { [role]: { [module]: ModulePermissions } }
  const matrix: Record<string, Record<string, ModulePermissions>> = {};
  for (const r of rows) {
    (matrix[r.role] ??= {})[r.module] = {
      canRead: r.canRead,
      canCreate: r.canCreate,
      canUpdate: r.canUpdate,
      canDelete: r.canDelete,
      canCancel: r.canCancel,
      canReopen: r.canReopen,
      canApprove: r.canApprove,
    };
  }

  return NextResponse.json({ matrix, modules: PERMISSION_MODULES });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only the Super Admin can manage access." }, { status: 403 });
  const orgId = session.user.organizationId;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { role, module, field, value } = parsed.data;

  if (role === "SUPER_USER" || role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super User and Super Admin always have full access — their rows aren't editable." },
      { status: 400 }
    );
  }

  await ensureRolePermissions(orgId);
  const updated = await prisma.rolePermission.update({
    where: {
      organizationId_role_module: {
        organizationId: orgId,
        role: role as UserRole,
        module,
      },
    },
    data: { [field]: value },
  });

  return NextResponse.json({
    permission: {
      role: updated.role,
      module: updated.module,
      canRead: updated.canRead,
      canCreate: updated.canCreate,
      canUpdate: updated.canUpdate,
      canDelete: updated.canDelete,
      canCancel: updated.canCancel,
      canReopen: updated.canReopen,
      canApprove: updated.canApprove,
    },
  });
}
