import { prisma } from "@/lib/prisma";
import { OPP_STAGES } from "@/lib/constants";

/**
 * SAP Transformation Intelligence Hub — configurable master data.
 *
 * Methodologies (SAP Activate roadmap templates with phases, durations and
 * deliverables), the transformation-type catalog, and the pipeline stage
 * gates are all org-scoped DB rows seeded once from the registries below and
 * fully editable in Admin → Configuration. There is no free public API for
 * SAP Roadmap Viewer, so the templates model its published SAP Activate
 * structure as local configuration.
 */

/* ------------------------------ defaults ------------------------------ */

type PhaseSeed = { name: string; color: string; durationWeeks: number; deliverables: string[] };
type MethodologySeed = { key: string; name: string; description: string; phases: PhaseSeed[] };

const ACTIVATE_DELIVERABLES: Record<string, string[]> = {
  Discover: ["Value Discovery", "Business Case", "Readiness Assessment"],
  Prepare: ["Project Charter", "Team Setup", "Landscape Preparation", "Kickoff"],
  Explore: ["Fit-to-Standard Workshops", "Delta Design", "Backlog", "Learning Needs Analysis"],
  Realize: ["Configuration", "Extensions", "Integrations", "Data Migration", "Testing"],
  Deploy: ["Cutover Plan", "Go-Live", "Hypercare"],
  Run: ["Continuous Improvement", "Support Model", "Optimization"],
};

const PHASE_COLORS: Record<string, string> = {
  Discover: "#6366F1",
  Prepare: "#0891B2",
  Explore: "#16A34A",
  Realize: "#D97706",
  Deploy: "#DC2626",
  Run: "#7C3AED",
};

function activatePhases(durations: number[]): PhaseSeed[] {
  const names = ["Discover", "Prepare", "Explore", "Realize", "Deploy", "Run"];
  return names.map((name, i) => ({
    name,
    color: PHASE_COLORS[name],
    durationWeeks: durations[i],
    deliverables: ACTIVATE_DELIVERABLES[name],
  }));
}

export const DEFAULT_METHODOLOGIES: MethodologySeed[] = [
  {
    key: "ACTIVATE_S4",
    name: "SAP Activate — S/4HANA (Private / On-Premise)",
    description:
      "SAP Activate roadmap for S/4HANA private cloud and on-premise transformations — Discover through Run with standard deliverables per phase.",
    phases: activatePhases([3, 4, 8, 20, 4, 6]), // slide 8: 45 weeks total
  },
  {
    key: "ACTIVATE_CLOUD",
    name: "SAP Activate — Cloud (Public / RISE)",
    description:
      "Accelerated SAP Activate roadmap for public-cloud and RISE engagements — shorter cycles with fit-to-standard emphasis.",
    phases: activatePhases([2, 3, 6, 12, 3, 4]),
  },
];

/** Slide-4 transformation catalog; each maps to a default methodology key. */
export const DEFAULT_TRANSFORMATION_TYPES: { key: string; name: string; subtitle: string; methodologyKey: string }[] = [
  { key: "GREENFIELD_S4_PUBLIC", name: "Greenfield", subtitle: "SAP S/4HANA Public Cloud", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "BROWNFIELD_ECC_S4", name: "Brownfield", subtitle: "ECC to S/4HANA Conversion", methodologyKey: "ACTIVATE_S4" },
  { key: "SELECTIVE_DATA_TRANSITION", name: "Selective Data Transition", subtitle: "Shell Conversion", methodologyKey: "ACTIVATE_S4" },
  { key: "RISE_PRIVATE_CLOUD", name: "RISE with SAP", subtitle: "Private Cloud", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "SUCCESSFACTORS_EC", name: "SAP SuccessFactors", subtitle: "Employee Central", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "ARIBA_PROCUREMENT", name: "SAP Ariba", subtitle: "Procurement", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "EWM_WAREHOUSE", name: "SAP EWM", subtitle: "Warehouse Management", methodologyKey: "ACTIVATE_S4" },
  { key: "TM_TRANSPORT", name: "SAP TM", subtitle: "Transportation Management", methodologyKey: "ACTIVATE_S4" },
  { key: "IBP_PLANNING", name: "SAP IBP", subtitle: "Integrated Business Planning", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "BTP_INTEGRATION", name: "SAP BTP", subtitle: "Integration Suite", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "SAC_ANALYTICS", name: "SAP SAC", subtitle: "Analytics Cloud", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "DATASPHERE", name: "SAP Datasphere", subtitle: "Data Platform", methodologyKey: "ACTIVATE_CLOUD" },
  { key: "MDG", name: "SAP MDG", subtitle: "Master Data Governance", methodologyKey: "ACTIVATE_S4" },
  { key: "GRC", name: "SAP GRC", subtitle: "Governance, Risk & Compliance", methodologyKey: "ACTIVATE_S4" },
  { key: "SIGNAVIO", name: "SAP Signavio", subtitle: "Process Transformation", methodologyKey: "ACTIVATE_CLOUD" },
];

/** Gate defaults: quote must be approved to enter Management Approval; a
 *  project must exist to enter Verbal Confirmation (both configurable). */
export const DEFAULT_GATES = {
  quoteRequiredStage: "MANAGEMENT_APPROVAL" as string | null,
  projectRequiredStage: "VERBAL_CONFIRMATION" as string | null,
};

/** Quote statuses that satisfy the "active / approved quote" gate. */
export const GATE_QUOTE_STATUSES = ["APPROVED", "SENT", "ACCEPTED"] as const;

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export const PHASE_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export const DELIVERABLE_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;

/* ------------------------------ seeding ------------------------------- */

/** Seed methodologies (with phases + deliverables), the transformation
 *  catalog and the gate config for an org — idempotent, first-read. */
export async function ensureSapConfig(orgId: string): Promise<void> {
  const count = await prisma.methodology.count({ where: { organizationId: orgId } });
  if (count === 0) {
    for (let mi = 0; mi < DEFAULT_METHODOLOGIES.length; mi++) {
      const m = DEFAULT_METHODOLOGIES[mi];
      await prisma.methodology.create({
        data: {
          organizationId: orgId,
          key: m.key,
          name: m.name,
          description: m.description,
          position: mi,
          phases: {
            create: m.phases.map((p, pi) => ({
              name: p.name,
              color: p.color,
              durationWeeks: p.durationWeeks,
              position: pi,
              deliverables: {
                create: p.deliverables.map((d, di) => ({ name: d, position: di })),
              },
            })),
          },
        },
      });
    }
  }

  const typeCount = await prisma.transformationType.count({ where: { organizationId: orgId } });
  if (typeCount === 0) {
    const methodologies = await prisma.methodology.findMany({
      where: { organizationId: orgId },
      select: { id: true, key: true },
    });
    const byKey = new Map(methodologies.map((m) => [m.key, m.id]));
    await prisma.transformationType.createMany({
      data: DEFAULT_TRANSFORMATION_TYPES.map((t, i) => ({
        organizationId: orgId,
        key: t.key,
        name: t.name,
        subtitle: t.subtitle,
        methodologyId: byKey.get(t.methodologyKey) ?? null,
        position: i,
      })),
      skipDuplicates: true,
    });
  }

  const gates = await prisma.pipelineGateConfig.findUnique({ where: { organizationId: orgId } });
  if (!gates) {
    await prisma.pipelineGateConfig
      .create({
        data: {
          organizationId: orgId,
          quoteRequiredStage: DEFAULT_GATES.quoteRequiredStage,
          projectRequiredStage: DEFAULT_GATES.projectRequiredStage,
        },
      })
      .catch(() => null); // race-safe: another request may have created it
  }
}

/* ------------------------------ getters ------------------------------- */

export async function getMethodologies(orgId: string) {
  await ensureSapConfig(orgId);
  return prisma.methodology.findMany({
    where: { organizationId: orgId },
    orderBy: { position: "asc" },
    include: {
      phases: {
        orderBy: { position: "asc" },
        include: { deliverables: { orderBy: { position: "asc" } } },
      },
    },
  });
}

export async function getTransformationTypes(orgId: string) {
  await ensureSapConfig(orgId);
  return prisma.transformationType.findMany({
    where: { organizationId: orgId },
    orderBy: { position: "asc" },
    include: { methodology: { select: { id: true, name: true, key: true } } },
  });
}

export async function getPipelineGates(orgId: string) {
  await ensureSapConfig(orgId);
  const g = await prisma.pipelineGateConfig.findUnique({ where: { organizationId: orgId } });
  return {
    quoteRequiredStage: g?.quoteRequiredStage ?? null,
    projectRequiredStage: g?.projectRequiredStage ?? null,
    sequentialPhases: g?.sequentialPhases ?? false,
    completeRequiresAllPhases: g?.completeRequiresAllPhases ?? true,
  };
}

/* ------------------------------- gates -------------------------------- */

const STAGE_ORDER = OPP_STAGES.filter((s) => s.value !== "LOST").map((s) => s.value as string);

export function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Check whether moving an opportunity to `targetStage` is blocked by a gate.
 * A gate applies when the target stage is at or beyond the configured stage.
 * Returns a human-readable reason, or null when the move is allowed.
 */
export async function gateBlockReason(
  orgId: string,
  opportunityId: string,
  targetStage: string
): Promise<string | null> {
  if (targetStage === "LOST") return null; // losing a deal is never gated
  const gates = await getPipelineGates(orgId);
  const target = stageIndex(targetStage);
  if (target < 0) return null;

  if (gates.quoteRequiredStage && target >= stageIndex(gates.quoteRequiredStage)) {
    const quote = await prisma.quotation.findFirst({
      where: {
        organizationId: orgId,
        opportunityId,
        status: { in: [...GATE_QUOTE_STATUSES] },
      },
      select: { id: true },
    });
    if (!quote) {
      const label = OPP_STAGES.find((s) => s.value === gates.quoteRequiredStage)?.label ?? gates.quoteRequiredStage;
      return `An approved quotation is required before moving to ${label} or beyond. Create and approve a quotation for this opportunity first.`;
    }
  }

  if (gates.projectRequiredStage && target >= stageIndex(gates.projectRequiredStage)) {
    const project = await prisma.project.findFirst({
      where: { organizationId: orgId, opportunityId },
      select: { id: true },
    });
    if (!project) {
      const label = OPP_STAGES.find((s) => s.value === gates.projectRequiredStage)?.label ?? gates.projectRequiredStage;
      return `A project is required before moving to ${label} or beyond. Use “Create project” on the opportunity first.`;
    }
  }

  return null;
}
