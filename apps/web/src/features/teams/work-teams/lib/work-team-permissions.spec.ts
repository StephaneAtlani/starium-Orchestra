import { describe, expect, it } from 'vitest';
import { getTeamsPermissionFlags } from './work-team-permissions';

function hasFactory(codes: string[]) {
  return (code: string) => codes.includes(code);
}

describe('getTeamsPermissionFlags', () => {
  it('lecture seule: read sans update ni manage_scopes', () => {
    const f = getTeamsPermissionFlags(hasFactory(['teams.read']));
    expect(f.canReadStructure).toBe(true);
    expect(f.canMutateTeams).toBe(false);
    expect(f.canManageScopes).toBe(false);
  });

  it('édition équipes: teams.update', () => {
    const f = getTeamsPermissionFlags(hasFactory(['teams.read', 'teams.update']));
    expect(f.canMutateTeams).toBe(true);
    expect(f.canManageScopes).toBe(false);
  });

  it('scopes: teams.manage_scopes', () => {
    const f = getTeamsPermissionFlags(
      hasFactory(['teams.read', 'teams.update', 'teams.manage_scopes']),
    );
    expect(f.canManageScopes).toBe(true);
  });
});
