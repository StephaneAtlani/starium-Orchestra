import type { ActivityTaxonomyKind } from '../types/team-assignment.types';

const KIND_LABELS: Record<ActivityTaxonomyKind, string> = {
  PROJECT: 'Projet',
  RUN: 'Run',
  SUPPORT: 'Support',
  TRANSVERSE: 'Transverse',
  OTHER: 'Autre',
};

export function activityTaxonomyKindLabel(kind: ActivityTaxonomyKind): string {
  return KIND_LABELS[kind] ?? kind;
}

export function formatAllocationPercent(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  return `${rounded} %`;
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

export function formatAssignmentPeriod(
  startIso: string,
  endIso: string | null | undefined,
): string {
  const a = formatDateOnly(startIso);
  const b = endIso ? formatDateOnly(endIso) : '…';
  return `${a} → ${b}`;
}

/** Corps API : début de journée UTC à partir d'une date `YYYY-MM-DD` (saisie formulaire). */
export function dateInputToStartIso(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00.000Z`).toISOString();
}

/** Fin de journée UTC pour `endDate` (inclusive côté métier courant). */
export function dateInputToEndIso(dateYmd: string): string {
  return new Date(`${dateYmd}T23:59:59.999Z`).toISOString();
}
