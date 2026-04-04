import type { ResourceListItem } from '@/services/resources';
import type {
  CollaboratorListItem,
  CollaboratorManagerOption,
  CollaboratorSource,
  CollaboratorStatus,
} from '../types/collaborator.types';

export function collaboratorStatusLabel(status: CollaboratorStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Actif';
    case 'INACTIVE':
      return 'Inactif';
    case 'DISABLED_SYNC':
      return 'Sync désactivée';
    default:
      return status;
  }
}

export function collaboratorSourceLabel(source: CollaboratorSource): string {
  switch (source) {
    case 'MANUAL':
      return 'Manuel';
    case 'DIRECTORY_SYNC':
      return 'Annuaire';
    default:
      return source;
  }
}

/** Libellé secondaire (email ou poste) — options managers ou ligne liste collaborateur. */
export function collaboratorManagerSecondaryLabel(
  option: CollaboratorManagerOption | Pick<CollaboratorListItem, 'email' | 'jobTitle'>,
): string | null {
  if (option.email?.trim()) return option.email.trim();
  if (option.jobTitle?.trim()) return option.jobTitle.trim();
  return null;
}

/** Libellé affiché pour une fiche Ressource catalogue Humaine (jamais l’UUID). */
export function humanResourceCatalogLabel(r: ResourceListItem): string {
  const name =
    [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ') || r.name.trim();
  if (r.email?.trim()) return `${name} — ${r.email.trim()}`;
  return name;
}

