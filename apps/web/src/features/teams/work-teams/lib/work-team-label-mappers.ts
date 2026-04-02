import type {
  ManagerScopeMode,
  WorkTeamMemberRole,
  WorkTeamStatus,
} from '../types/work-team.types';

export function workTeamStatusLabel(status: WorkTeamStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Actif';
    case 'ARCHIVED':
      return 'Archivé';
    default:
      return status;
  }
}

export function workTeamMemberRoleLabel(role: WorkTeamMemberRole): string {
  switch (role) {
    case 'MEMBER':
      return 'Membre';
    case 'LEAD':
      return 'Référent';
    case 'DEPUTY':
      return 'Adjoint';
    default:
      return role;
  }
}

export function managerScopeModeLabel(mode: ManagerScopeMode): string {
  switch (mode) {
    case 'DIRECT_REPORTS_ONLY':
      return 'Hiérarchique (N+1 directs uniquement)';
    case 'TEAM_SUBTREE':
      return 'Équipes (sous-arborescence)';
    case 'HYBRID':
      return 'Hybride (directs + équipes)';
    default:
      return mode;
  }
}
