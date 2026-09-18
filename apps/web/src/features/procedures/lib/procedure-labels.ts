import type { ProcedureCategoryApi, ProcedureStatusApi } from '../types/procedure.types';

export const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategoryApi, string> = {
  SECURITY: 'Sécurité',
  OPERATIONS: 'Opérations',
  HR: 'RH',
  IT_SERVICE: 'Service IT',
  COMPLIANCE: 'Conformité',
  OTHER: 'Autre',
};

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatusApi, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publiée',
  ARCHIVED: 'Archivée',
};

export function procedureCategoryLabel(category: ProcedureCategoryApi): string {
  return PROCEDURE_CATEGORY_LABELS[category] ?? 'Autre';
}

export function procedureStatusLabel(status: ProcedureStatusApi): string {
  return PROCEDURE_STATUS_LABELS[status] ?? 'Statut inconnu';
}
