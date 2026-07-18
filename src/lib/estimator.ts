/**
 * Intelligent Project Estimator — deterministic engine (PPT slides 6–7).
 *
 * Project characteristics → complexity score → duration scaling, effort by
 * phase, resource mix and costing. Rates come from the org's manpower rate
 * cards (closest-designation match) with indicative fallbacks, exactly like
 * the AI quote drafter — the model itself needs no LLM key, so estimates are
 * consistent and reproducible across all opportunities.
 */

import { resolveMonthlyRate, type RateCardRow } from "@/lib/rate-match";

/* ------------------------------- inputs ------------------------------- */

export const ESTIMATOR_FIELDS = [
  { key: "users", label: "Number of users", weight: 0.8 },
  { key: "countries", label: "Countries", weight: 30 },
  { key: "legalEntities", label: "Legal entities", weight: 15 },
  { key: "plants", label: "Plants", weight: 10 },
  { key: "warehouses", label: "Warehouses", weight: 8 },
  { key: "interfaces", label: "Interfaces", weight: 12 },
  { key: "reports", label: "Reports", weight: 4 },
  { key: "customDevelopments", label: "Custom developments", weight: 10 },
  { key: "conversions", label: "Conversions", weight: 8 },
  { key: "forms", label: "Forms", weight: 4 },
  { key: "workflows", label: "Workflows", weight: 6 },
  { key: "migrationObjects", label: "Migration objects", weight: 6 },
  { key: "testingCycles", label: "Testing cycles", weight: 20 },
  { key: "supportMonths", label: "Support months (hypercare+)", weight: 0 },
  { key: "trainingLocations", label: "Training locations", weight: 8 },
] as const;

export type EstimatorInputs = Record<(typeof ESTIMATOR_FIELDS)[number]["key"], number>;

export const EMPTY_INPUTS: EstimatorInputs = Object.fromEntries(
  ESTIMATOR_FIELDS.map((f) => [f.key, 0])
) as EstimatorInputs;

/* ------------------------------- outputs ------------------------------ */

export type EstimateRole = {
  role: string;
  count: number;
  months: number;
  monthlyRate: number;
  rateSource: "card" | "default";
  cost: number;
};

export type EstimateResult = {
  complexity: number; // 1.0 – 3.0
  durationWeeks: number;
  durationMonths: number;
  totalEffortPM: number; // person-months
  effortByPhase: { name: string; weeks: number; effortPM: number }[];
  roles: EstimateRole[];
  totals: {
    implementationCost: number;
    contingency: number;
    internalCost: number; // implementation + contingency
    customerPrice: number;
    grossMargin: number;
    marginPct: number;
  };
  assumptions: string[];
};

const MARKUP_PCT = 35;
const CONTINGENCY_PCT = 10;
// SAP Activate effort distribution across phases (of total build effort).
const PHASE_EFFORT_SPLIT: Record<string, number> = {
  Discover: 0.05,
  Prepare: 0.08,
  Explore: 0.18,
  Realize: 0.45,
  Deploy: 0.12,
  Run: 0.12,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* -------------------------------- model ------------------------------- */

export function estimate(
  inputs: EstimatorInputs,
  roadmap: { name: string; durationWeeks: number }[],
  cards: RateCardRow[]
): EstimateResult {
  // Complexity: weighted characteristic points → 1.0 (trivial) … 3.0 (very complex).
  const points = ESTIMATOR_FIELDS.reduce(
    (sum, f) => sum + (Number(inputs[f.key]) || 0) * f.weight,
    0
  );
  const complexity = clamp(1 + points / 900, 1, 3);

  // Duration: the configured roadmap scales with the square root of complexity
  // (throughput grows with team size, so duration grows sub-linearly).
  const baseWeeks = roadmap.reduce((n, p) => n + p.durationWeeks, 0) || 45;
  const durationWeeks = Math.round(baseWeeks * Math.sqrt(complexity));
  const durationMonths = Math.max(1, Math.round(durationWeeks / 4.33));

  // Effort: baseline 24 person-months scaled by complexity, plus support.
  const buildEffortPM = Math.round(24 * complexity * 10) / 10;
  const supportPM = (Number(inputs.supportMonths) || 0) * 1.5; // support team of ~1.5 FTE
  const totalEffortPM = Math.round((buildEffortPM + supportPM) * 10) / 10;

  const effortByPhase = roadmap.map((p) => ({
    name: p.name,
    weeks: Math.round(p.durationWeeks * Math.sqrt(complexity)),
    effortPM: Math.round(buildEffortPM * (PHASE_EFFORT_SPLIT[p.name] ?? 1 / roadmap.length) * 10) / 10,
  }));

  // Resource mix (slide 7): scale each role with its driving characteristic.
  const functionalCount = clamp(2 + Math.floor(points / 450), 2, 8);
  const buildMonths = Math.max(2, Math.round(durationMonths * 0.75));
  const roleDefs: { role: string; count: number; months: number }[] = [
    { role: "Project Manager", count: 1, months: durationMonths },
    { role: "Solution Architect", count: 1, months: durationMonths },
    { role: "Functional Consultant", count: functionalCount, months: buildMonths },
    { role: "ABAP Developer", count: clamp(1 + Math.floor((inputs.customDevelopments || 0) / 8), 1, 6), months: buildMonths },
    { role: "Integration Consultant", count: clamp(Math.ceil((inputs.interfaces || 0) / 10) || 1, 1, 4), months: Math.max(2, Math.round(buildMonths * 0.7)) },
    { role: "Data Migration Consultant", count: clamp(Math.ceil(((inputs.conversions || 0) + (inputs.migrationObjects || 0)) / 10) || 1, 1, 4), months: Math.max(2, Math.round(buildMonths * 0.6)) },
    { role: "QA Engineer", count: clamp(Math.ceil((inputs.testingCycles || 0) / 2) || 1, 1, 3), months: Math.max(2, Math.round(buildMonths * 0.6)) },
    { role: "Basis Consultant", count: 1, months: Math.max(2, Math.round(durationMonths * 0.5)) },
  ];

  const roles: EstimateRole[] = roleDefs.map((r) => {
    const res = resolveMonthlyRate(r.role, cards);
    return {
      role: r.role,
      count: r.count,
      months: r.months,
      monthlyRate: res.rate,
      rateSource: res.source,
      cost: r.count * r.months * res.rate,
    };
  });

  const implementationCost = roles.reduce((n, r) => n + r.cost, 0);
  const contingency = Math.round(implementationCost * (CONTINGENCY_PCT / 100));
  const internalCost = implementationCost + contingency;
  const customerPrice = Math.round(internalCost * (1 + MARKUP_PCT / 100));
  const grossMargin = customerPrice - internalCost;

  return {
    complexity: Math.round(complexity * 100) / 100,
    durationWeeks,
    durationMonths,
    totalEffortPM,
    effortByPhase,
    roles,
    totals: {
      implementationCost,
      contingency,
      internalCost,
      customerPrice,
      grossMargin,
      marginPct: customerPrice > 0 ? Math.round((grossMargin / customerPrice) * 1000) / 10 : 0,
    },
    assumptions: [
      `Complexity ${Math.round(complexity * 100) / 100}× derived from ${Math.round(points)} weighted characteristic points.`,
      `Duration scales the configured roadmap (${baseWeeks}wk) by √complexity.`,
      `${MARKUP_PCT}% billing markup, ${CONTINGENCY_PCT}% contingency.`,
      roles.some((r) => r.rateSource === "card")
        ? "Rates matched to your manpower rate cards where a designation matched; others use indicative estimates."
        : "All rates are indicative estimates — add manpower rate cards for grounded pricing.",
    ],
  };
}
