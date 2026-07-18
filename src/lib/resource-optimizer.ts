/**
 * Resource Optimizer (PPT slide 9) — a deterministic staffing plan derived
 * from the saved estimate: consultants required, onsite/offshore mix,
 * Arabic/local consultants for GCC engagements, functional:technical ratio,
 * PMO & QA requirements, and peak staffing periods.
 */

import type { EstimatorInputs, EstimateResult } from "@/lib/estimator";

export type RoleBucket = "management" | "functional" | "technical" | "qa";

/** Which staffing bucket a role belongs to and its natural onsite share. */
const ROLE_PROFILE: Record<string, { bucket: RoleBucket; onsitePct: number }> = {
  "Project Manager": { bucket: "management", onsitePct: 80 },
  "Solution Architect": { bucket: "functional", onsitePct: 70 },
  "Functional Consultant": { bucket: "functional", onsitePct: 50 },
  "ABAP Developer": { bucket: "technical", onsitePct: 15 },
  "Integration Consultant": { bucket: "technical", onsitePct: 30 },
  "Data Migration Consultant": { bucket: "technical", onsitePct: 30 },
  "QA Engineer": { bucket: "qa", onsitePct: 20 },
  "Basis Consultant": { bucket: "technical", onsitePct: 20 },
};

export type OptimizedRole = {
  role: string;
  count: number;
  months: number;
  bucket: RoleBucket;
  onsite: number; // headcount recommended onsite
  offshore: number;
};

export type PhaseStaffing = {
  name: string;
  weeks: number;
  headcount: number; // avg FTE during the phase
  isPeak: boolean;
};

export type ResourcePlan = {
  totalConsultants: number;
  totalFteMonths: number;
  roles: OptimizedRole[];
  onsitePct: number; // FTE-month weighted
  offshorePct: number;
  functionalFteMonths: number;
  technicalFteMonths: number;
  ratioLabel: string; // e.g. "1 : 1.4"
  pmo: { required: boolean; reason: string };
  qa: { count: number; note: string };
  gcc: { arabicFunctional: number; localLead: number; notes: string[] } | null;
  phases: PhaseStaffing[];
  peakLabel: string;
  notes: string[];
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function optimizeResources(
  inputs: EstimatorInputs,
  result: EstimateResult,
  opts: { gccRegion: boolean }
): ResourcePlan {
  const countries = Number(inputs.countries) || 0;
  const training = Number(inputs.trainingLocations) || 0;

  // Distributed rollouts pull more people onsite (workshops, training, cutover).
  const onsiteBoost = clamp((Math.max(countries - 1, 0)) * 4 + Math.max(training - 1, 0) * 2, 0, 15);

  const roles: OptimizedRole[] = result.roles.map((r) => {
    const profile = ROLE_PROFILE[r.role] ?? { bucket: "technical" as const, onsitePct: 30 };
    const pct = clamp(profile.onsitePct + (profile.bucket === "functional" ? onsiteBoost : Math.round(onsiteBoost / 2)), 0, 90);
    const onsite = clamp(Math.round((r.count * pct) / 100), profile.bucket === "management" ? 1 : 0, r.count);
    return {
      role: r.role,
      count: r.count,
      months: r.months,
      bucket: profile.bucket,
      onsite,
      offshore: r.count - onsite,
    };
  });

  const totalConsultants = roles.reduce((n, r) => n + r.count, 0);
  const fte = (rs: OptimizedRole[]) => rs.reduce((n, r) => n + r.count * r.months, 0);
  const totalFteMonths = fte(roles);
  const onsiteFte = roles.reduce((n, r) => n + r.onsite * r.months, 0);
  const onsitePct = totalFteMonths > 0 ? Math.round((onsiteFte / totalFteMonths) * 100) : 0;

  const functionalFteMonths = fte(roles.filter((r) => r.bucket === "functional"));
  const technicalFteMonths = fte(roles.filter((r) => r.bucket === "technical"));
  const ratio = functionalFteMonths > 0 ? technicalFteMonths / functionalFteMonths : 0;
  const ratioLabel = `1 : ${Math.round(ratio * 10) / 10}`;

  // PMO: warranted on large or multi-country programmes.
  const pmoRequired = result.totalEffortPM > 40 || countries > 2;
  const pmo = {
    required: pmoRequired,
    reason: pmoRequired
      ? `${result.totalEffortPM} person-months${countries > 2 ? ` across ${countries} countries` : ""} — add a PMO analyst for governance, RAID and status reporting.`
      : "Programme size is within a single PM's span — PM covers PMO duties.",
  };

  const qaRole = roles.find((r) => r.bucket === "qa");
  const qa = {
    count: qaRole?.count ?? 0,
    note: `${qaRole?.count ?? 0} QA engineer${(qaRole?.count ?? 0) === 1 ? "" : "s"} sized for ${Number(inputs.testingCycles) || 0} testing cycle${(Number(inputs.testingCycles) || 0) === 1 ? "" : "s"} (SIT + UAT support).`,
  };

  // GCC engagements: Arabic-speaking functional coverage + a local engagement lead.
  const functionalHeads = roles.filter((r) => r.bucket === "functional").reduce((n, r) => n + r.count, 0);
  const gcc = opts.gccRegion
    ? {
        arabicFunctional: Math.max(1, Math.ceil(functionalHeads / 2)),
        localLead: 1,
        notes: [
          "Staff Arabic-speaking functional consultants for workshops, training and UAT facilitation.",
          "Local engagement lead onsite for stakeholder and government-entity liaison.",
          "Include Arabic UI/output localization and GCC statutory requirements (e-invoicing, VAT) in scope.",
        ],
      }
    : null;

  // Peak staffing: average FTE per phase = phase effort / phase months.
  const phaseFte = result.effortByPhase.map((p) => ({
    name: p.name,
    weeks: p.weeks,
    headcount: p.weeks > 0 ? Math.max(1, Math.round(p.effortPM / (p.weeks / 4.33))) : 0,
  }));
  const peak = Math.max(...phaseFte.map((p) => p.headcount), 0);
  const phases: PhaseStaffing[] = phaseFte.map((p) => ({ ...p, isPeak: p.headcount === peak && peak > 0 }));
  const peakPhases = phases.filter((p) => p.isPeak).map((p) => p.name);
  const peakLabel = peakPhases.length
    ? `Peak of ~${peak} FTE during ${peakPhases.join(" & ")} — secure those consultants early.`
    : "Run the estimator to compute peak staffing.";

  return {
    totalConsultants,
    totalFteMonths: Math.round(totalFteMonths),
    roles,
    onsitePct,
    offshorePct: 100 - onsitePct,
    functionalFteMonths: Math.round(functionalFteMonths),
    technicalFteMonths: Math.round(technicalFteMonths),
    ratioLabel,
    pmo,
    qa,
    gcc,
    phases,
    peakLabel,
    notes: [
      "Onsite share is FTE-month weighted; management and functional roles skew onsite, build roles offshore.",
      countries > 1
        ? `${countries}-country rollout raises the onsite share by ${onsiteBoost} pts for workshops, training and cutover support.`
        : "Single-country delivery keeps the offshore leverage high.",
    ],
  };
}

/** Slide-9 deliverable library — reusable artifacts mapped to their natural
 *  SAP Activate phase, add-able to any project as tasks. */
export const DELIVERABLE_LIBRARY: { name: string; phase: string; blurb: string }[] = [
  { name: "Project Charter", phase: "Prepare", blurb: "Objectives, scope, governance and success criteria" },
  { name: "Governance Plan", phase: "Prepare", blurb: "Steering cadence, escalation paths, decision rights" },
  { name: "RAID Log", phase: "Prepare", blurb: "Risks, assumptions, issues, dependencies register" },
  { name: "Risk Register", phase: "Prepare", blurb: "Scored risks with owners and mitigations" },
  { name: "Test Strategy", phase: "Explore", blurb: "Test levels, environments, entry/exit criteria" },
  { name: "Migration Strategy", phase: "Explore", blurb: "Objects, tooling, mock-load and reconciliation plan" },
  { name: "Data Cleansing Tracker", phase: "Realize", blurb: "Source-data quality actions by object" },
  { name: "UAT Plan", phase: "Realize", blurb: "Scenarios, testers, defect triage, sign-off" },
  { name: "Cutover Plan", phase: "Deploy", blurb: "Minute-by-minute runbook with rollback points" },
  { name: "Operational Readiness", phase: "Deploy", blurb: "Support model, SLAs, access and monitoring checks" },
  { name: "Hypercare Checklist", phase: "Run", blurb: "Stabilization exit criteria and daily checks" },
  { name: "Knowledge Transfer Plan", phase: "Run", blurb: "Handover sessions, docs and shadowing schedule" },
];
