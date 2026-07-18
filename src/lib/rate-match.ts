/**
 * Manpower rate-card matching — shared by the AI quote drafter and the
 * project estimator. Resolves a role name to the closest rate-card
 * designation; falls back to indicative monthly rates (INR).
 */

/** Indicative monthly cost (INR) per role keyword. Order matters. */
export function roleMonthlyRate(role: string): number {
  const r = role.toLowerCase();
  if (/(solution|cloud|enterprise)\s*architect|architect|tech(nical)?\s*lead|delivery (manager|lead)/.test(r)) return 450000;
  if (/project manager|program manager|\bpm\b|scrum master/.test(r)) return 350000;
  if (/data engineer|ai engineer|ml engineer/.test(r)) return 320000;
  if (/devops|sre|site reliability|basis/.test(r)) return 300000;
  if (/consultant|business analyst|\bba\b|functional/.test(r)) return 300000;
  if (/ui\/?ux|ux|designer/.test(r)) return 250000;
  if (/\bqa\b|test|quality/.test(r)) return 200000;
  if (/developer|engineer|programmer|full ?stack|back ?end|front ?end|abap|integration|migration|cpi/.test(r)) return 280000;
  return 280000;
}

const ROLE_ALIASES: Record<string, string> = {
  pm: "project manager",
  ba: "business analyst",
  qa: "quality assurance",
  dev: "developer",
  sa: "solution architect",
  po: "product owner",
};

function normRole(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9/ ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Normalize + expand abbreviations + singularize tokens for matching. */
export function canonRole(s: string): string {
  return normRole(s)
    .split(" ")
    .map((t) => ROLE_ALIASES[t] ?? t)
    .join(" ")
    .split(" ")
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export type RateCardRow = { designation: string; monthlyRate: unknown };

// Common role tokens that don't distinguish a role on their own.
const GENERIC_TOKENS = new Set([
  "engineer", "developer", "consultant", "manager", "analyst", "lead",
  "specialist", "officer", "executive", "senior", "junior", "sr", "jr",
  "associate", "expert", "architect", "the", "of", "and",
]);

/** Resolve a role's monthly cost: closest manpower rate-card designation, else default. */
export function resolveMonthlyRate(
  role: string,
  cards: RateCardRow[]
): { rate: number; source: "card" | "default"; matched?: string } {
  const r = canonRole(role);
  const rTokens = new Set(r.split(" ").filter(Boolean));
  let best: RateCardRow | null = null;
  let bestScore = 0;
  for (const c of cards) {
    const d = canonRole(c.designation);
    let score = 0;
    if (d === r) score = 100;
    else if (d && (r.includes(d) || d.includes(r))) score = 60 + Math.min(d.length, r.length);
    else {
      // Token overlap — but require a DISTINGUISHING (non-generic) shared token,
      // so "AI Engineer" doesn't match "QA Engineer" on "engineer" alone.
      let specific = 0;
      let generic = 0;
      for (const t of d.split(" ")) {
        if (t && rTokens.has(t)) (GENERIC_TOKENS.has(t) ? generic++ : specific++);
      }
      if (specific) score = 30 + specific * 16 + generic * 4;
      else if (generic >= 2) score = 22;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (best && bestScore >= 20) {
    const n = Number(best.monthlyRate);
    if (Number.isFinite(n) && n > 0) return { rate: n, source: "card", matched: best.designation };
  }
  return { rate: roleMonthlyRate(role), source: "default" };
}
