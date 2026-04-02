import { describe, expect, it } from 'vitest';
import { teamAssignmentQueryKeys } from './team-assignment-query-keys';

describe('teamAssignmentQueryKeys', () => {
  const clientId = 'client-1';

  it('all keys start with teams / team-assignments', () => {
    expect(teamAssignmentQueryKeys.all[0]).toBe('teams');
    expect(teamAssignmentQueryKeys.all[1]).toBe('team-assignments');
  });

  it('list key includes clientId and params', () => {
    const params = { limit: 20, offset: 0, includeCancelled: false };
    const k = teamAssignmentQueryKeys.list(clientId, params);
    expect(k).toContain(clientId);
    expect(k).toContain(params);
  });

  it('projectList key includes projectId', () => {
    const k = teamAssignmentQueryKeys.projectList(clientId, 'proj-1', {
      limit: 20,
      offset: 0,
    });
    expect(k).toContain('proj-1');
    expect(k).toContain(clientId);
  });

  it('isolates clients', () => {
    expect(teamAssignmentQueryKeys.list('a', {})).not.toEqual(
      teamAssignmentQueryKeys.list('b', {}),
    );
  });
});
