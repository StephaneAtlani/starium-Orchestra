import { describe, expect, it } from 'vitest';
import { collaboratorQueryKeys } from './collaborator-query-keys';

describe('collaboratorQueryKeys', () => {
  const clientId = 'client-1';

  it('all keys start with ["teams", "collaborators"]', () => {
    expect(collaboratorQueryKeys.all).toEqual(['teams', 'collaborators']);
    expect(collaboratorQueryKeys.list(clientId, {})[0]).toBe('teams');
    expect(collaboratorQueryKeys.list(clientId, {})[1]).toBe('collaborators');
    expect(collaboratorQueryKeys.detail(clientId, 'c1')[0]).toBe('teams');
    expect(collaboratorQueryKeys.detail(clientId, 'c1')[1]).toBe('collaborators');
    expect(collaboratorQueryKeys.managerOptions(clientId, {})[0]).toBe('teams');
    expect(collaboratorQueryKeys.managerOptions(clientId, {})[1]).toBe('collaborators');
  });

  it('includes clientId in every generated key', () => {
    expect(collaboratorQueryKeys.list(clientId, {})).toContain(clientId);
    expect(collaboratorQueryKeys.detail(clientId, 'c1')).toContain(clientId);
    expect(collaboratorQueryKeys.managerOptions(clientId, {})).toContain(clientId);
  });

  it('produces different keys for different clients', () => {
    expect(collaboratorQueryKeys.list('client-1', {})).not.toEqual(
      collaboratorQueryKeys.list('client-2', {}),
    );
    expect(collaboratorQueryKeys.detail('client-1', 'c1')).not.toEqual(
      collaboratorQueryKeys.detail('client-2', 'c1'),
    );
    expect(collaboratorQueryKeys.managerOptions('client-1', {})).not.toEqual(
      collaboratorQueryKeys.managerOptions('client-2', {}),
    );
  });

  it('list key distinguishes filter params', () => {
    const a = collaboratorQueryKeys.list(clientId, { search: 'alice' });
    const b = collaboratorQueryKeys.list(clientId, { search: 'bob' });
    expect(a).not.toEqual(b);
  });

  it('detail key distinguishes collaboratorId', () => {
    const a = collaboratorQueryKeys.detail(clientId, 'collab-a');
    const b = collaboratorQueryKeys.detail(clientId, 'collab-b');
    expect(a).not.toEqual(b);
    expect(a).toContain('collab-a');
    expect(b).toContain('collab-b');
  });

  it('managerOptions key isolates by client and params', () => {
    const a = collaboratorQueryKeys.managerOptions(clientId, { search: 'x' });
    const b = collaboratorQueryKeys.managerOptions(clientId, { search: 'y' });
    expect(a).not.toEqual(b);
  });
});
