import { prisma } from "@/lib/prisma";

/**
 * Frontend-configurable field & activity master data.
 *
 * Every module's fields (label, active, required, position) and the activity
 * types live in the DB (FieldConfig / ActivityTypeConfig), seeded on first read
 * from the registries below. Admin → Configuration edits them; module forms
 * read getModuleConfig() to render accordingly.
 */

export type FieldType =
  | "text" | "textarea" | "number" | "currency" | "date" | "email" | "phone" | "select";

export const MODULES = ["LEAD", "OPPORTUNITY", "CUSTOMER", "QUOTATION", "RFQ", "ACTIVITY"] as const;
export type ModuleKey = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  LEAD: "Leads",
  OPPORTUNITY: "Opportunities",
  CUSTOMER: "Customers",
  QUOTATION: "Quotations",
  RFQ: "RFQs",
  ACTIVITY: "Activities",
};

type DefaultField = { key: string; label: string; fieldType: FieldType; required?: boolean; options?: string[] };

/** Default (core) fields per module — seeded once, then editable in Admin. */
export const DEFAULT_FIELDS: Record<ModuleKey, DefaultField[]> = {
  LEAD: [
    { key: "name", label: "Lead name", fieldType: "text", required: true },
    { key: "company", label: "Company", fieldType: "text", required: true },
    { key: "contactPerson", label: "Contact person", fieldType: "text" },
    { key: "email", label: "Email", fieldType: "email" },
    { key: "mobile", label: "Mobile", fieldType: "phone" },
    { key: "expectedRevenue", label: "Expected revenue", fieldType: "currency" },
    { key: "source", label: "Source", fieldType: "select" },
    { key: "industry", label: "Industry", fieldType: "select" },
    { key: "status", label: "Status", fieldType: "select" },
    { key: "notes", label: "Notes", fieldType: "textarea" },
  ],
  OPPORTUNITY: [
    { key: "title", label: "Title", fieldType: "text", required: true },
    { key: "customerId", label: "Customer", fieldType: "select", required: true },
    { key: "expectedRevenue", label: "Expected revenue", fieldType: "currency" },
    { key: "stage", label: "Stage", fieldType: "select" },
    { key: "expectedCloseDate", label: "Expected close date", fieldType: "date" },
    { key: "probability", label: "Probability %", fieldType: "number" },
    { key: "businessUnitId", label: "Business unit", fieldType: "select" },
    { key: "territoryId", label: "Territory", fieldType: "select" },
    { key: "notes", label: "Notes", fieldType: "textarea" },
  ],
  CUSTOMER: [
    { key: "name", label: "Customer name", fieldType: "text", required: true },
    { key: "industry", label: "Industry", fieldType: "select" },
    { key: "website", label: "Website", fieldType: "text" },
    { key: "country", label: "Country", fieldType: "text" },
    { key: "region", label: "Region", fieldType: "text" },
    { key: "gstNumber", label: "GST number", fieldType: "text" },
    { key: "billingAddress", label: "Billing address", fieldType: "textarea" },
    { key: "shippingAddress", label: "Shipping address", fieldType: "textarea" },
  ],
  QUOTATION: [
    { key: "validUntil", label: "Valid until", fieldType: "date" },
    { key: "currency", label: "Currency", fieldType: "text" },
    { key: "notes", label: "Notes", fieldType: "textarea" },
    { key: "termsAndConditions", label: "Terms & conditions", fieldType: "textarea" },
  ],
  RFQ: [
    { key: "title", label: "Title", fieldType: "text", required: true },
    { key: "customerId", label: "Customer", fieldType: "select" },
    { key: "status", label: "Status", fieldType: "select" },
    { key: "dueDate", label: "Due date", fieldType: "date" },
    { key: "notes", label: "Notes", fieldType: "textarea" },
  ],
  ACTIVITY: [
    { key: "type", label: "Type", fieldType: "select", required: true },
    { key: "subject", label: "Subject", fieldType: "text", required: true },
    { key: "dueAt", label: "Due / scheduled at", fieldType: "date" },
    { key: "status", label: "Status", fieldType: "select" },
    { key: "description", label: "Notes", fieldType: "textarea" },
  ],
};

export type ConfiguredField = {
  id: string;
  module: string;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  position: number;
  isCustom: boolean;
  fieldType: string;
  options: string[] | null;
  helpText: string | null;
};

export const DEFAULT_ACTIVITY_TYPES = [
  { key: "CALL", label: "Call", icon: "Phone", color: "#2563EB" },
  { key: "MEETING", label: "Meeting", icon: "Users", color: "#7C3AED" },
  { key: "EMAIL", label: "Email", icon: "Mail", color: "#0891B2" },
  { key: "FOLLOW_UP", label: "Follow-up", icon: "Clock", color: "#D97706" },
  { key: "TASK", label: "Task", icon: "CheckSquare", color: "#16A34A" },
  { key: "NOTE", label: "Note", icon: "StickyNote", color: "#64748B" },
];

function isModule(m: string): m is ModuleKey {
  return (MODULES as readonly string[]).includes(m);
}

/** Seed default fields for a module if none exist yet (idempotent). */
export async function ensureModuleConfig(orgId: string, module: ModuleKey): Promise<void> {
  const count = await prisma.fieldConfig.count({ where: { organizationId: orgId, module } });
  if (count > 0) return;
  await prisma.fieldConfig.createMany({
    data: DEFAULT_FIELDS[module].map((f, i) => ({
      organizationId: orgId,
      module,
      fieldKey: f.key,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required ?? false,
      position: i,
      isCustom: false,
      active: true,
    })),
    skipDuplicates: true,
  });
}

/** Ordered field config for a module (seeds defaults on first read). */
export async function getModuleConfig(orgId: string, module: string): Promise<ConfiguredField[]> {
  if (!isModule(module)) return [];
  await ensureModuleConfig(orgId, module);
  const rows = await prisma.fieldConfig.findMany({
    where: { organizationId: orgId, module },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    module: r.module,
    fieldKey: r.fieldKey,
    label: r.label,
    active: r.active,
    required: r.required,
    position: r.position,
    isCustom: r.isCustom,
    fieldType: r.fieldType,
    options: (r.options as string[] | null) ?? null,
    helpText: r.helpText ?? null,
  }));
}

export async function ensureActivityTypes(orgId: string): Promise<void> {
  const count = await prisma.activityTypeConfig.count({ where: { organizationId: orgId } });
  if (count > 0) return;
  await prisma.activityTypeConfig.createMany({
    data: DEFAULT_ACTIVITY_TYPES.map((t, i) => ({
      organizationId: orgId,
      key: t.key,
      label: t.label,
      icon: t.icon,
      color: t.color,
      position: i,
      active: true,
    })),
    skipDuplicates: true,
  });
}

export type ConfiguredActivityType = {
  id: string; key: string; label: string; icon: string; color: string; active: boolean; position: number;
};

export async function getActivityTypes(orgId: string): Promise<ConfiguredActivityType[]> {
  await ensureActivityTypes(orgId);
  return prisma.activityTypeConfig.findMany({
    where: { organizationId: orgId },
    orderBy: [{ position: "asc" }],
  });
}
