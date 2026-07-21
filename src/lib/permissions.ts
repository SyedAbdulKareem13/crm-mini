/**
 * Role-based access control (SERVER) — the permission matrix engine.
 *
 * One row per (role, module): READ / CREATE / UPDATE / DELETE plus the
 * special actions CANCEL / REOPEN / APPROVE. Seeded with sensible defaults
 * on first read; fully editable in Admin → Access. Every employee inherits
 * from their assigned role. ADMIN always passes every check (safety: the
 * org can never lock itself out of Admin).
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";

/** The active role taxonomy (legacy enum values are never offered/seeded). */
export const ACTIVE_ROLES = [
  { value: "SUPER_USER", label: "Super User" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_OWNER", label: "Sales Owner" },
  { value: "SALES_HEAD", label: "Sales Head" },
  { value: "BUSINESS_HEAD", label: "Business Head" },
  { value: "FINANCE_ANALYST", label: "Finance Analyst" },
  { value: "FINANCE_HEAD", label: "Finance Head" },
] as const;
export type ActiveRole = (typeof ACTIVE_ROLES)[number]["value"];

/** Full-access bypass: Super User & Super Admin see and do everything. */
export const SUPER_ROLES: readonly string[] = ["SUPER_USER", "SUPER_ADMIN"];
/** Only Super Admin grants access (user onboarding + permission matrix). */
export const ACCESS_MANAGER_ROLES: readonly string[] = ["SUPER_ADMIN"];
/** Org-configuration surfaces (gates, methodologies, master data, fields). */
export const ADMIN_SURFACE_ROLES: readonly string[] = ["SUPER_ADMIN", "SUPER_USER", "ADMIN"];

export const isSuper = (role: string | null | undefined) => !!role && SUPER_ROLES.includes(role);
export const canManageAccess = (role: string | null | undefined) =>
  !!role && ACCESS_MANAGER_ROLES.includes(role);
export const hasAdminSurface = (role: string | null | undefined) =>
  !!role && ADMIN_SURFACE_ROLES.includes(role);

export const PERMISSION_MODULES = [
  { key: "LEADS", label: "Leads" },
  { key: "OPPORTUNITIES", label: "Opportunities" },
  { key: "RFQS", label: "RFQs" },
  { key: "QUOTATIONS", label: "Quotations" },
  { key: "PROJECTS", label: "Projects" },
  { key: "CUSTOMERS", label: "Customers" },
  { key: "ACTIVITIES", label: "Activities" },
  { key: "RATE_CARDS", label: "Rate Cards" },
  { key: "APPROVALS", label: "Approvals" },
  { key: "REPORTS", label: "Reports" },
  { key: "ADMIN", label: "Admin" },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];
export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "cancel"
  | "reopen"
  | "approve";

export type ModulePermissions = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canReopen: boolean;
  canApprove: boolean;
};

const ALL: ModulePermissions = {
  canRead: true, canCreate: true, canUpdate: true, canDelete: true,
  canCancel: true, canReopen: true, canApprove: true,
};
const RW: ModulePermissions = { ...ALL, canDelete: false, canReopen: false, canApprove: false };
const READ_ONLY: ModulePermissions = {
  canRead: true, canCreate: false, canUpdate: false, canDelete: false,
  canCancel: false, canReopen: false, canApprove: false,
};
const NONE: ModulePermissions = { ...READ_ONLY, canRead: false };

/** Seeded defaults per ACTIVE role — fully editable afterwards (except the
 *  super roles, which bypass the matrix entirely). */
const DEFAULTS: Record<ActiveRole, Partial<Record<PermissionModule, ModulePermissions>> & { "*": ModulePermissions }> = {
  SUPER_USER: { "*": ALL },
  SUPER_ADMIN: { "*": ALL },
  // Client-side admin — broad by default; the Super Admin tunes it here.
  ADMIN: { "*": ALL },
  SALES_OWNER: {
    "*": { ...RW, canCancel: false },
    ADMIN: NONE,
    RATE_CARDS: READ_ONLY,
    APPROVALS: READ_ONLY,
    REPORTS: READ_ONLY,
    PROJECTS: READ_ONLY,
  },
  SALES_HEAD: {
    "*": { ...ALL, canDelete: false, canApprove: false },
    ADMIN: NONE,
    RATE_CARDS: READ_ONLY,
    PROJECTS: { ...RW, canCancel: true, canReopen: true },
  },
  BUSINESS_HEAD: {
    "*": { ...ALL, canDelete: false },
    ADMIN: READ_ONLY,
    RATE_CARDS: { ...RW, canDelete: false },
  },
  FINANCE_ANALYST: {
    "*": READ_ONLY,
    ADMIN: NONE,
    RATE_CARDS: { ...RW, canDelete: false },
  },
  FINANCE_HEAD: {
    "*": READ_ONLY,
    ADMIN: NONE,
    QUOTATIONS: { ...READ_ONLY, canApprove: true },
    APPROVALS: { ...READ_ONLY, canApprove: true },
    RATE_CARDS: { ...ALL, canCancel: false, canReopen: false, canApprove: false },
  },
};

const ACTION_FIELD: Record<PermissionAction, keyof ModulePermissions> = {
  read: "canRead",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
  cancel: "canCancel",
  reopen: "canReopen",
  approve: "canApprove",
};

/** Seed missing (role, module) rows for the org — idempotent, cheap when full. */
export async function ensureRolePermissions(organizationId: string): Promise<void> {
  const count = await prisma.rolePermission.count({ where: { organizationId } });
  const roles = ACTIVE_ROLES.map((r) => r.value) as unknown as UserRole[];
  const expected = roles.length * PERMISSION_MODULES.length;
  if (count >= expected) return;

  const existing = await prisma.rolePermission.findMany({
    where: { organizationId },
    select: { role: true, module: true },
  });
  const have = new Set(existing.map((e) => `${e.role}:${e.module}`));
  const rows: Prisma.RolePermissionCreateManyInput[] = [];
  for (const role of roles) {
    for (const m of PERMISSION_MODULES) {
      if (have.has(`${role}:${m.key}`)) continue;
      const roleDefaults = DEFAULTS[role as ActiveRole];
      const def = roleDefaults[m.key] ?? roleDefaults["*"];
      rows.push({ organizationId, role, module: m.key, ...def });
    }
  }
  if (rows.length) await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
}

/** The full matrix for one role (seeds first). */
export async function getRolePermissions(
  organizationId: string,
  role: UserRole
): Promise<Record<string, ModulePermissions>> {
  await ensureRolePermissions(organizationId);
  const rows = await prisma.rolePermission.findMany({ where: { organizationId, role } });
  const out: Record<string, ModulePermissions> = {};
  for (const r of rows) {
    out[r.module] = {
      canRead: r.canRead, canCreate: r.canCreate, canUpdate: r.canUpdate, canDelete: r.canDelete,
      canCancel: r.canCancel, canReopen: r.canReopen, canApprove: r.canApprove,
    };
  }
  return out;
}

/** Single permission check. Super User / Super Admin always pass. */
export async function can(
  organizationId: string,
  role: string | null | undefined,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> {
  if (isSuper(role)) return true;
  if (!role) return false;
  await ensureRolePermissions(organizationId);
  const row = await prisma.rolePermission.findUnique({
    where: { organizationId_role_module: { organizationId, role: role as UserRole, module } },
  });
  if (!row) return false;
  return row[ACTION_FIELD[action]];
}

/** Route guard: returns a 403 response to send, or null when allowed. */
export async function requirePermission(
  session: { user?: { organizationId?: string | null; role?: string | null } } | null,
  module: PermissionModule,
  action: PermissionAction
): Promise<NextResponse | null> {
  const orgId = session?.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await can(orgId, session!.user!.role, module, action);
  if (ok) return null;
  const verb = action === "read" ? "view" : action;
  return NextResponse.json(
    {
      error: `Your role doesn't have ${verb} access to ${PERMISSION_MODULES.find((m) => m.key === module)?.label ?? module}. Ask an admin to adjust it in Admin → Access.`,
      code: "forbidden",
    },
    { status: 403 }
  );
}

/** Module keys the role can READ — drives navigation and page gating. */
export async function readableModules(
  organizationId: string,
  role: string | null | undefined
): Promise<PermissionModule[]> {
  if (isSuper(role)) return PERMISSION_MODULES.map((m) => m.key);
  if (!role) return [];
  await ensureRolePermissions(organizationId);
  const rows = await prisma.rolePermission.findMany({
    where: { organizationId, role: role as UserRole, canRead: true },
    select: { module: true },
  });
  return rows.map((r) => r.module as PermissionModule);
}

/** Nav href → module mapping (shared contract for sidebar/mobile gating). */
export const MODULE_BY_HREF: Record<string, PermissionModule> = {
  "/app/leads": "LEADS",
  "/app/opportunities": "OPPORTUNITIES",
  "/app/pipeline": "OPPORTUNITIES",
  "/app/rfqs": "RFQS",
  "/app/quotations": "QUOTATIONS",
  "/app/projects": "PROJECTS",
  "/app/customers": "CUSTOMERS",
  "/app/activities": "ACTIVITIES",
  "/app/rate-cards": "RATE_CARDS",
  "/app/approvals": "APPROVALS",
  "/app/reports": "REPORTS",
  "/app/audit": "REPORTS",
  "/app/admin": "ADMIN",
};
