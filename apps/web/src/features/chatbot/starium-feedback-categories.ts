/** Aligné sur `apps/api/.../starium-feedback-category.ts` (POST /api/chatbot/feedback). */
export const STARIUM_FEEDBACK_CATEGORY_CODES = [
  'BUG',
  'UX',
  'FEATURE',
  'PERFORMANCE',
  'CHATBOT',
  'ASSISTANCE',
  'OTHER',
] as const;

export type StariumFeedbackCategoryCode = (typeof STARIUM_FEEDBACK_CATEGORY_CODES)[number];

export const STARIUM_FEEDBACK_CATEGORY_LABEL: Record<StariumFeedbackCategoryCode, string> = {
  BUG: 'Bug ou comportement incorrect',
  UX: 'Ergonomie, clarté, navigation',
  FEATURE: 'Idée ou besoin métier',
  PERFORMANCE: 'Lenteur ou fiabilité',
  CHATBOT: 'Assistance Cursor Starium',
  ASSISTANCE: 'Assistance',
  OTHER: 'Autre',
};
