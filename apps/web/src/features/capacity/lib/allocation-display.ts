import type { CapacityAllocationDto } from '../types/capacity.types';

/** Libellé métier de la cible d’affectation (jamais un ID seul). */
export function allocationTargetLabel(a: CapacityAllocationDto): string {
  if (a.workTeam?.name) return a.workTeam.name;
  if (a.resource?.name) return a.resource.name;
  if (a.sourceRestricted) return 'Source restreinte';
  return 'Cible non renseignée';
}

/** Affiche un montant J/H (string ou number API). */
export function formatCapacityDays(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

/** Normalise une saisie UI vers string numérique pour IsNumberString. */
export function toDaysString(raw: string): string {
  const t = raw.trim().replace(',', '.');
  if (!t) return '';
  const n = Number(t);
  if (!Number.isFinite(n)) return t;
  return String(n);
}
