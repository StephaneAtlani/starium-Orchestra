/** Catégories de retour produit (widget Feedback Starium) — garder aligné avec le web. */
export const STARIUM_FEEDBACK_CATEGORY_CODES = [
  'BUG',
  'UX',
  'FEATURE',
  'PERFORMANCE',
  'CHATBOT',
  'OTHER',
] as const;

export type StariumFeedbackCategoryCode =
  (typeof STARIUM_FEEDBACK_CATEGORY_CODES)[number];
