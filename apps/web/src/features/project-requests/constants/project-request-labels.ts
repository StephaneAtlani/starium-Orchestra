export const PROJECT_REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  NEEDS_MORE_INFO: 'Compléments demandés',
  IN_REVIEW: 'En instruction',
  IN_CYCLE: 'En cycle de pilotage',
  APPROVED: 'Validée',
  POSTPONED: 'Ajournée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  CONVERTED_TO_PROJECT: 'Projet créé',
};

export const PROJECT_REQUEST_TYPE_LABELS: Record<string, string> = {
  TRANSFORMATION: 'Transformation',
  INFRASTRUCTURE: 'Infrastructure',
  REGULATORY: 'Réglementaire',
  PRODUCT: 'Produit & innovation',
  EVOLUTION: 'Évolution applicative',
};

export const PROJECT_REQUEST_PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'Haute',
  MEDIUM: 'Moyenne',
  LOW: 'Basse',
};

export const PROJECT_REQUEST_URGENCY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

export const PROJECT_REQUEST_OPINION_LABELS: Record<string, string> = {
  FAVORABLE: 'Favorable',
  RESERVED: 'Réservé',
  UNFAVORABLE: 'Défavorable',
};

export const CIRCUIT_STATUSES = new Set([
  'SUBMITTED',
  'IN_REVIEW',
  'IN_CYCLE',
  'APPROVED',
]);

export const DONE_STATUSES = new Set([
  'CONVERTED_TO_PROJECT',
  'REJECTED',
  'POSTPONED',
  'CANCELLED',
]);
