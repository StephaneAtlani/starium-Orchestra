import type { PreviewReason } from '../types/budget-imports.types';

const LABELS: Partial<Record<PreviewReason, string>> = {
  MATCHED_BY_EXTERNAL_ID: 'Correspondance par ID externe',
  MATCHED_BY_COMPOSITE_KEY: 'Correspondance par clé composite',
  NO_MATCH_CREATE: 'Création (aucune correspondance)',
  NO_MATCH_UPDATE_ONLY: 'Ignoré — mode mise à jour seule sans correspondance',
  MISSING_ENVELOPE: 'Enveloppe manquante ou introuvable',
  INVALID_AMOUNT: 'Montant invalide',
  INVALID_DATE: 'Date invalide',
  MISSING_REQUIRED_FIELD: 'Champ obligatoire manquant',
  DUPLICATE_SOURCE_KEY: 'Doublon de clé dans le fichier',
  AMBIGUOUS_MATCH: 'Correspondance ambiguë',
};

export function previewReasonLabel(reason: PreviewReason | undefined): string {
  if (!reason) return '—';
  return LABELS[reason] ?? reason;
}
