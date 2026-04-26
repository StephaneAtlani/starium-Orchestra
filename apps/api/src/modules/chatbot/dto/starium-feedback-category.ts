/** Catégories de retour produit (widget Feedback Starium) — garder aligné avec le web. */
export const STARIUM_FEEDBACK_CATEGORY_CODES = [
  'BUG',
  'UX',
  'FEATURE',
  'PERFORMANCE',
  'CHATBOT',
  'ASSISTANCE',
  'OTHER',
] as const;

export type StariumFeedbackCategoryCode =
  (typeof STARIUM_FEEDBACK_CATEGORY_CODES)[number];

/** Libellés métier (alignés sur le widget web) — affichage admin / notifs. */
export const STARIUM_FEEDBACK_CATEGORY_LABELS: Record<
  StariumFeedbackCategoryCode,
  string
> = {
  BUG: 'Bug ou comportement incorrect',
  UX: 'Ergonomie, clarté, navigation',
  FEATURE: 'Idée ou besoin métier',
  PERFORMANCE: 'Lenteur ou fiabilité',
  CHATBOT: 'Assistance Cursor Starium',
  ASSISTANCE: 'Assistance',
  OTHER: 'Autre',
};
