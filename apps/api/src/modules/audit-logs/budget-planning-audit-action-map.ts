/**
 * Point d’entrée unique : filtres audit planning budgétaire (RFC-023).
 * Anciennes actions → variantes DB pour lecture / filtres (pas de double écriture).
 */

/** Actions canoniques écrites après migration RFC-023 */
export const BUDGET_PLANNING_CANONICAL = {
  UPDATED: 'budget_line.planning.updated',
  APPLIED_MODE: 'budget_line.planning.applied_mode',
  PREVIEWED: 'budget_line.planning.previewed',
} as const;

const LEGACY_UPDATED = 'budget_line_planning.updated';
const LEGACY_PREVIEW = 'budget_line_planning.calculated_previewed';
const LEGACY_APPLIED = [
  'budget_line_planning.applied_annual_spread',
  'budget_line_planning.applied_quarterly',
  'budget_line_planning.applied_one_shot',
  'budget_line_planning.applied_growth',
  'budget_line_planning.applied_calculation',
] as const;

const FULL_APPLIED_VARIANTS = [
  BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
  ...LEGACY_APPLIED,
];

/**
 * Clés = valeur acceptée en query `action` (canonique ou legacy).
 * Valeurs = liste des `action` persistées en base à inclure dans `where.in`.
 */
export const BUDGET_PLANNING_AUDIT_ACTION_VARIANTS: Record<string, string[]> = {
  [BUDGET_PLANNING_CANONICAL.UPDATED]: [
    BUDGET_PLANNING_CANONICAL.UPDATED,
    LEGACY_UPDATED,
  ],
  [LEGACY_UPDATED]: [BUDGET_PLANNING_CANONICAL.UPDATED, LEGACY_UPDATED],

  [BUDGET_PLANNING_CANONICAL.APPLIED_MODE]: FULL_APPLIED_VARIANTS,
  ...Object.fromEntries(LEGACY_APPLIED.map((a) => [a, FULL_APPLIED_VARIANTS])),

  [BUDGET_PLANNING_CANONICAL.PREVIEWED]: [
    BUDGET_PLANNING_CANONICAL.PREVIEWED,
    LEGACY_PREVIEW,
  ],
  [LEGACY_PREVIEW]: [BUDGET_PLANNING_CANONICAL.PREVIEWED, LEGACY_PREVIEW],
};

/**
 * Normalise une action audit planning vers le nom canonique (affichage / analytics).
 */
export function normalizeBudgetPlanningAuditAction(action: string): string {
  if (
    action === BUDGET_PLANNING_CANONICAL.UPDATED ||
    action === LEGACY_UPDATED
  ) {
    return BUDGET_PLANNING_CANONICAL.UPDATED;
  }
  if (LEGACY_APPLIED.includes(action as (typeof LEGACY_APPLIED)[number])) {
    return BUDGET_PLANNING_CANONICAL.APPLIED_MODE;
  }
  if (action === BUDGET_PLANNING_CANONICAL.APPLIED_MODE) {
    return BUDGET_PLANNING_CANONICAL.APPLIED_MODE;
  }
  if (action === BUDGET_PLANNING_CANONICAL.PREVIEWED || action === LEGACY_PREVIEW) {
    return BUDGET_PLANNING_CANONICAL.PREVIEWED;
  }
  return action;
}
