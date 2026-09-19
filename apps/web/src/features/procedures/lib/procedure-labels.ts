import type {
  ProcedureCategoryRef,
  ProcedureStatusApi,
  ProcedureTemplateStatusApi,
} from '../types/procedure.types';
import { displayLabel } from '@/lib/display-label';

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatusApi, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En relecture',
  PENDING_VALIDATION: 'En validation',
  PUBLISHED: 'Publiée',
  ARCHIVED: 'Archivée',
};

export const PROCEDURE_TEMPLATE_STATUS_LABELS: Record<
  ProcedureTemplateStatusApi,
  string
> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  ARCHIVED: 'Archivé',
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

export function procedureTemplateStatusLabel(
  status: ProcedureTemplateStatusApi,
): string {
  return PROCEDURE_TEMPLATE_STATUS_LABELS[status] ?? 'Statut inconnu';
}
