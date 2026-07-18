/**
 * Estimator calibration — learns correction factors from closed projects.
 *
 * When a project is marked COMPLETED, the project route snapshots actual vs.
 * estimated duration and effort into Project.data.actuals. This module reads
 * those snapshots across the org and derives median correction factors so the
 * deterministic estimator (src/lib/estimator.ts) bends toward what delivery
 * teams actually experience — no LLM, fully reproducible.
 *
 * The Calibration type lives in estimator.ts (which stays client-safe); this
 * server-only module imports prisma and reuses that type.
 */

import { prisma } from "@/lib/prisma";
import type { Calibration } from "@/lib/estimator";

export type { Calibration };

/** Median of a non-empty numeric list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

type Actuals = {
  actualWeeks?: number;
  actualEffortPM?: number;
  estimatedWeeks?: number;
  estimatedEffortPM?: number;
};

/**
 * Compute duration/effort correction factors from the org's completed projects.
 * Returns null when no completed project carries a usable actuals snapshot.
 */
export async function computeCalibration(organizationId: string): Promise<Calibration | null> {
  const projects = await prisma.project.findMany({
    where: { organizationId, status: "COMPLETED" },
    select: { data: true },
  });

  const durationRatios: number[] = [];
  const effortRatios: number[] = [];
  let samples = 0;

  for (const p of projects) {
    const data =
      p.data && typeof p.data === "object" && !Array.isArray(p.data)
        ? (p.data as Record<string, unknown>)
        : {};
    const actuals = (data.actuals ?? {}) as Actuals;
    const estimator = (data.estimator ?? {}) as { result?: { durationWeeks?: number } };

    // Estimated duration prefers the frozen snapshot, else the live estimator result.
    const estimatedWeeks = actuals.estimatedWeeks ?? estimator.result?.durationWeeks ?? 0;
    const actualWeeks = actuals.actualWeeks ?? 0;
    const estimatedEffortPM = actuals.estimatedEffortPM ?? 0;
    const actualEffortPM = actuals.actualEffortPM ?? 0;

    let contributed = false;
    if (actualWeeks > 0 && estimatedWeeks > 0) {
      durationRatios.push(actualWeeks / estimatedWeeks);
      contributed = true;
    }
    if (actualEffortPM > 0 && estimatedEffortPM > 0) {
      effortRatios.push(actualEffortPM / estimatedEffortPM);
      contributed = true;
    }
    if (contributed) samples += 1;
  }

  if (samples === 0) return null;

  const durationFactor =
    durationRatios.length > 0 ? clamp(median(durationRatios), 0.6, 1.8) : 1;
  const effortFactor = effortRatios.length > 0 ? clamp(median(effortRatios), 0.6, 1.8) : 1;

  return {
    durationFactor: round2(durationFactor),
    effortFactor: round2(effortFactor),
    samples,
  };
}
