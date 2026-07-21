/**
 * Client-safe helpers that map stable enum VALUES to i18n keys, so display
 * text is resolved via t(...) instead of hardcoded English labels. This keeps
 * every consumer (board, stepper, table badge, filters, dialogs) localized from
 * one source of truth — the enum — with the label living in the `stages`
 * translation namespace.
 *
 * Usage (client component):
 *   const { t } = useI18n();
 *   t(stageKey(opp.stage))            // e.g. "QUALIFICATION" -> t("stages.qualification")
 *   t(stageKey(opp.stage), undefined) // falls back to humanized English if unseeded
 */

/** UPPER_SNAKE enum value -> lowerCamel leaf (REQUIREMENT_ANALYSIS -> requirementAnalysis). */
export function enumToCamel(value: string): string {
  return value.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** OpportunityStage enum value -> "stages.<leaf>" translation key. */
export function stageKey(stage: string): string {
  return `stages.${enumToCamel(stage)}`;
}
