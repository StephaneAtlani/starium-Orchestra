import { describe, expect, it } from 'vitest';
import {
  managerScopeModeLabel,
  workTeamMemberRoleLabel,
  workTeamStatusLabel,
} from './work-team-label-mappers';

describe('workTeamStatusLabel', () => {
  it('maps ACTIVE et ARCHIVED en français', () => {
    expect(workTeamStatusLabel('ACTIVE')).toBe('Actif');
    expect(workTeamStatusLabel('ARCHIVED')).toBe('Archivé');
  });
});

describe('workTeamMemberRoleLabel', () => {
  it('mappe les rôles membres', () => {
    expect(workTeamMemberRoleLabel('MEMBER')).toBe('Membre');
    expect(workTeamMemberRoleLabel('LEAD')).toBe('Référent');
    expect(workTeamMemberRoleLabel('DEPUTY')).toBe('Adjoint');
  });
});

describe('managerScopeModeLabel', () => {
  it('mappe les modes de périmètre', () => {
    expect(managerScopeModeLabel('DIRECT_REPORTS_ONLY')).toContain('Hiérarchique');
    expect(managerScopeModeLabel('TEAM_SUBTREE')).toContain('Équipes');
    expect(managerScopeModeLabel('HYBRID')).toContain('Hybride');
  });
});
