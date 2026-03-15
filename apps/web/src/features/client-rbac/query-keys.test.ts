import { clientRbacKeys } from './query-keys';

describe('clientRbacKeys', () => {
  it('includes activeClientId in all keys', () => {
    const clientId = 'client-1';
    expect(clientRbacKeys.roles(clientId)).toContain(clientId);
    expect(clientRbacKeys.role(clientId, 'role-1')).toContain(clientId);
    expect(clientRbacKeys.role(clientId, 'role-1')).toContain('role-1');
    expect(clientRbacKeys.permissions(clientId)).toContain(clientId);
    expect(clientRbacKeys.members(clientId)).toContain(clientId);
    expect(clientRbacKeys.userRoles(clientId, 'user-1')).toContain(clientId);
    expect(clientRbacKeys.userRoles(clientId, 'user-1')).toContain('user-1');
  });

  it('produces different keys for different clients', () => {
    const key1 = clientRbacKeys.roles('client-1');
    const key2 = clientRbacKeys.roles('client-2');
    expect(key1).not.toEqual(key2);
  });

  it('produces different keys for different roleIds', () => {
    const key1 = clientRbacKeys.role('client-1', 'role-a');
    const key2 = clientRbacKeys.role('client-1', 'role-b');
    expect(key1).not.toEqual(key2);
  });

  it('all keys start with client-rbac', () => {
    const clientId = 'c';
    expect(clientRbacKeys.roles(clientId)[0]).toBe('client-rbac');
    expect(clientRbacKeys.role(clientId, 'r')[0]).toBe('client-rbac');
    expect(clientRbacKeys.permissions(clientId)[0]).toBe('client-rbac');
    expect(clientRbacKeys.members(clientId)[0]).toBe('client-rbac');
    expect(clientRbacKeys.userRoles(clientId, 'u')[0]).toBe('client-rbac');
  });
});
