import { describe, expect, it } from 'vitest';
import { workTeamQueryKeys } from './work-team-query-keys';

describe('workTeamQueryKeys', () => {
  const clientId = 'client-1';

  it('all keys start with ["teams", "work-teams"]', () => {
    expect(workTeamQueryKeys.all).toEqual(['teams', 'work-teams']);
    expect(workTeamQueryKeys.list(clientId, {})[0]).toBe('teams');
    expect(workTeamQueryKeys.list(clientId, {})[1]).toBe('work-teams');
    expect(workTeamQueryKeys.detail(clientId, 't1')[0]).toBe('teams');
    expect(workTeamQueryKeys.detail(clientId, 't1')[1]).toBe('work-teams');
  });

  it('includes clientId in list, detail, members, manager scope keys', () => {
    expect(workTeamQueryKeys.list(clientId, {})).toContain(clientId);
    expect(workTeamQueryKeys.detail(clientId, 't1')).toContain(clientId);
    expect(workTeamQueryKeys.members(clientId, 't1', {})).toContain(clientId);
    expect(workTeamQueryKeys.managerScope(clientId, 'm1')).toContain(clientId);
    expect(workTeamQueryKeys.managerScopePreview(clientId, 'm1', {})).toContain(clientId);
  });

  it('produces different keys for different clients', () => {
    expect(workTeamQueryKeys.list('client-1', {})).not.toEqual(workTeamQueryKeys.list('client-2', {}));
  });

  it('tree key isolates parentId / includeArchived', () => {
    const root = workTeamQueryKeys.tree(clientId, {});
    const child = workTeamQueryKeys.tree(clientId, { parentId: 'p1' });
    expect(root).not.toEqual(child);
  });
});
