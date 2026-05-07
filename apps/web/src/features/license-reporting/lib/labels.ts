/**
 * Libellés métier pour le reporting RFC-ACL-012.
 * Source unique : aucune chaîne calculée n'apparaît dans le composant UI.
 */

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CANCELED: 'Annulé',
  EXPIRED: 'Expiré',
};

export const LICENSE_BILLING_MODE_LABELS: Record<string, string> = {
  CLIENT_BILLABLE: 'Lecture/Écriture facturable',
  EXTERNAL_BILLABLE: 'Externe (porté hors client)',
  NON_BILLABLE: 'Geste commercial',
  PLATFORM_INTERNAL: 'Support interne',
  EVALUATION: 'Évaluation 30 jours',
};

export const LICENSE_BUCKET_LABELS = {
  readOnly: 'Lecture seule',
  clientBillable: 'Lecture/Écriture facturable',
  externalBillable: 'Externe',
  nonBillable: 'Geste commercial',
  platformInternalActive: 'Support interne actif',
  platformInternalExpired: 'Support interne expiré',
  evaluationActive: 'Évaluation active',
  evaluationExpired: 'Évaluation expirée',
} as const;
