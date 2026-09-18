import type {
  ProcedureCategoryRef,
  ProcedureStatusApi,
} from '../types/procedure.types';
import { displayLabel } from '@/lib/display-label';

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatusApi, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En revue',
  PUBLISHED: 'Publiée',
  ARCHIVED: 'Archivée',
};

export function procedureCategoryLabel(
  category: ProcedureCategoryRef | string | null | undefined,
): string {
  if (category && typeof category === 'object') {
    return displayLabel(category.label, 'Catégorie inconnue');
  }
  if (typeof category === 'string' && category.trim()) {
    return displayLabel(category, 'Catégorie inconnue');
  }
  return 'Catégorie inconnue';
}

export function procedureStatusLabel(status: ProcedureStatusApi): string {
  return PROCEDURE_STATUS_LABELS[status] ?? 'Statut inconnu';
}
