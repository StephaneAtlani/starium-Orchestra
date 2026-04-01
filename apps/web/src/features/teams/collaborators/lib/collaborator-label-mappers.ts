import type {
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

export function collaboratorManagerSecondaryLabel(
  option: CollaboratorManagerOption,
): string | null {
  if (option.email?.trim()) return option.email.trim();
  if (option.jobTitle?.trim()) return option.jobTitle.trim();
  return null;
}

