/**
 * AI Proposal Generator (PPT slide 10) — assembles a client-ready proposal
 * from the project + its saved estimate: executive summary, scope,
 * implementation approach, resource plan, timeline, commercials,
 * deliverables, risks and acceptance criteria.
 *
 * The assembly is deterministic; the executive summary can optionally be
 * polished by Gemini in the API route (falls back to the template text).
 */

import type { EstimatorInputs, EstimateResult } from "@/lib/estimator";
import { ESTIMATOR_FIELDS } from "@/lib/estimator";
import { optimizeResources } from "@/lib/resource-optimizer";

export type ProposalPhase = {
  name: string;
  weeks: number;
  effortPM: number;
  deliverables: string[];
};

export type ProposalData = {
  generatedAt: string;
  executiveSummary: string;
  aiSummary: boolean; // true when Gemini wrote the executive summary
  scope: {
    inScope: string[];
    outOfScope: string[];
    assumptions: string[];
  };
  approach: string[];
  phases: ProposalPhase[];
  resourcePlan: {
    role: string;
    count: number;
    months: number;
    onsite: number;
    offshore: number;
  }[];
  timelineLabel: string;
  commercials: {
    currency: string;
    customerPrice: number;
    durationMonths: number;
    totalEffortPM: number;
    paymentMilestones: { label: string; pct: number }[];
  };
  risks: { risk: string; mitigation: string }[];
  acceptanceCriteria: string[];
};

export type ProposalContext = {
  projectName: string;
  projectNumber: string;
  customerName: string | null;
  organizationName: string;
  methodologyName: string | null;
  transformationTypeName: string | null;
  inputs: EstimatorInputs;
  result: EstimateResult;
  phaseDeliverables: { name: string; deliverables: string[] }[]; // from the live roadmap
};

const n = (v: unknown) => Number(v) || 0;

/** Human list of the non-zero sizing characteristics, for scope text. */
function characteristicHighlights(inputs: EstimatorInputs): string[] {
  return ESTIMATOR_FIELDS.filter((f) => n(inputs[f.key]) > 0).map(
    (f) => `${n(inputs[f.key])} ${f.label.toLowerCase().replace(/^number of /, "")}`
  );
}

export function buildProposal(ctx: ProposalContext): ProposalData {
  const { inputs, result } = ctx;
  const client = ctx.customerName ?? "the client";
  const method = ctx.methodologyName ?? "SAP Activate";
  const scopeName = ctx.transformationTypeName ?? "SAP transformation";
  const highlights = characteristicHighlights(inputs);
  const plan = optimizeResources(inputs, result, { gccRegion: false });

  const executiveSummary =
    `${ctx.organizationName} is pleased to submit this proposal to ${client} for the ${ctx.projectName} ` +
    `(${scopeName}) engagement. Based on the assessed solution footprint` +
    (highlights.length ? ` — ${highlights.slice(0, 5).join(", ")} —` : "") +
    ` we propose a ${result.durationMonths}-month delivery following the ${method} methodology, ` +
    `staffed with ${plan.totalConsultants} consultants (${result.totalEffortPM} person-months of effort). ` +
    `Our phased approach de-risks delivery through configurable stage gates, a reusable deliverable library, ` +
    `and continuous governance from Discover through Run.`;

  const inScope = [
    `${scopeName} implementation delivered with the ${method} roadmap (${result.durationWeeks} weeks planned).`,
    ...(n(inputs.countries) > 0
      ? [`Rollout across ${n(inputs.countries)} countr${n(inputs.countries) === 1 ? "y" : "ies"}${n(inputs.legalEntities) ? ` and ${n(inputs.legalEntities)} legal entit${n(inputs.legalEntities) === 1 ? "y" : "ies"}` : ""}.`]
      : []),
    ...(n(inputs.plants) + n(inputs.warehouses) > 0
      ? [`Coverage of ${n(inputs.plants)} plant${n(inputs.plants) === 1 ? "" : "s"}${n(inputs.warehouses) ? ` and ${n(inputs.warehouses)} warehouse${n(inputs.warehouses) === 1 ? "" : "s"}` : ""}.`]
      : []),
    ...(n(inputs.interfaces) > 0 ? [`Design, build and test of ${n(inputs.interfaces)} interfaces.`] : []),
    ...(n(inputs.customDevelopments) > 0 ? [`${n(inputs.customDevelopments)} custom developments (RICEFW) as catalogued during Explore.`] : []),
    ...(n(inputs.reports) + n(inputs.forms) > 0 ? [`${n(inputs.reports)} reports and ${n(inputs.forms)} forms.`] : []),
    ...(n(inputs.conversions) + n(inputs.migrationObjects) > 0
      ? [`Data migration covering ${n(inputs.conversions) + n(inputs.migrationObjects)} conversion/migration objects with mock loads and reconciliation.`]
      : []),
    ...(n(inputs.testingCycles) > 0 ? [`${n(inputs.testingCycles)} formal testing cycles (SIT/UAT) with entry and exit criteria.`] : []),
    ...(n(inputs.trainingLocations) > 0 ? [`End-user training across ${n(inputs.trainingLocations)} location${n(inputs.trainingLocations) === 1 ? "" : "s"}.`] : []),
    ...(n(inputs.supportMonths) > 0 ? [`${n(inputs.supportMonths)} months of post-go-live hypercare and support.`] : []),
    `Cutover planning and execution with rollback checkpoints.`,
    `Project governance: steering cadence, RAID management and status reporting.`,
  ];

  const outOfScope = [
    "Hardware, hosting and third-party software licensing (procured by the client).",
    "Custom developments, interfaces or reports beyond the counts listed in scope.",
    "Business process re-engineering outside the agreed solution design.",
    "Source-system data cleansing execution (client-owned; we provide the tracker and rules).",
    "End-user device readiness and network infrastructure.",
  ];

  const assumptions = [
    ...result.assumptions,
    "Client SMEs and process owners are available for workshops, testing and sign-offs per the plan.",
    "Decisions and deliverable sign-offs are turned around within five working days.",
    "A single production landscape with standard three-tier environments.",
    "Client provides timely system access, VPN and required licenses for the project team.",
  ];

  const approach = [
    `Delivery follows ${method}, the proven phased methodology, with configurable stage gates enforced between phases.`,
    `Each phase carries a defined deliverable set drawn from our reusable library (charters, RAID logs, test strategy, cutover runbook), giving ${client} full transparency on progress and quality.`,
    `Progress is tracked live in Manzil One — roadmap, Gantt schedule, deliverable ownership and health indicators — shared with your stakeholders throughout.`,
  ];

  const phases: ProposalPhase[] = result.effortByPhase.map((p) => ({
    name: p.name,
    weeks: p.weeks,
    effortPM: p.effortPM,
    deliverables:
      ctx.phaseDeliverables.find((d) => d.name.toLowerCase() === p.name.toLowerCase())?.deliverables ?? [],
  }));

  const resourcePlan = plan.roles.map((r) => ({
    role: r.role,
    count: r.count,
    months: r.months,
    onsite: r.onsite,
    offshore: r.offshore,
  }));

  return {
    generatedAt: "", // stamped by the caller
    executiveSummary,
    aiSummary: false,
    scope: { inScope, outOfScope, assumptions },
    approach,
    phases,
    resourcePlan,
    timelineLabel: `${result.durationWeeks} weeks (~${result.durationMonths} months) end to end; ${plan.peakLabel}`,
    commercials: {
      currency: "INR",
      customerPrice: result.totals.customerPrice,
      durationMonths: result.durationMonths,
      totalEffortPM: result.totalEffortPM,
      paymentMilestones: [
        { label: "Mobilization (contract signature)", pct: 20 },
        { label: "Explore complete (solution design sign-off)", pct: 20 },
        { label: "Realize complete (SIT exit)", pct: 30 },
        { label: "Go-live", pct: 20 },
        { label: "Hypercare exit", pct: 10 },
      ],
    },
    risks: [
      { risk: "Source data quality delays migration", mitigation: "Early mock loads, data cleansing tracker owned jointly from Explore." },
      { risk: "Key client SMEs unavailable at peak phases", mitigation: "Named SMEs with booked calendars agreed at Prepare; escalation via steering committee." },
      { risk: "Scope creep on custom developments", mitigation: "RICEFW catalogue baselined at Explore exit; changes via change control with impact assessment." },
      { risk: "Third-party interface partners not ready", mitigation: "Interface register with partner readiness dates tracked from Explore; stubs for SIT." },
      { risk: "Low end-user adoption at go-live", mitigation: "Role-based training, hypercare floor-walking and adoption metrics during Run." },
    ],
    acceptanceCriteria: [
      "Each phase exits only when its deliverables are approved (stage-gate sign-off).",
      "SIT exit: all planned test cycles executed, no open critical/high defects.",
      "UAT sign-off by client process owners for every in-scope business process.",
      "Cutover completed per runbook with reconciliation reports accepted.",
      "Hypercare exit: agreed stabilization criteria met for the defined support window.",
    ],
  };
}
