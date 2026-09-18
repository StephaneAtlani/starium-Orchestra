import type { ProcedureCategoryApi, ProcedureStatusApi } from '../types/procedure.types';

export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategoryApi, string> = {
  PILOTAGE: 'Pilotage',
  COMPLIANCE: 'Conformité',
  FINANCE: 'Finance',
  ORGANISATION: 'Organisation',
  SECURITY: 'Sécurité',
};

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatusApi, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En revue',
  PUBLISHED: 'Publiée',
  ARCHIVED: 'Archivée',
};

export function procedureCategoryLabel(category: ProcedureCategoryApi): string {
  return PROCEDURE_CATEGORY_LABELS[category] ?? 'Catégorie inconnue';
}

export function procedureStatusLabel(status: ProcedureStatusApi): string {
  return PROCEDURE_STATUS_LABELS[status] ?? 'Statut inconnu';
}
