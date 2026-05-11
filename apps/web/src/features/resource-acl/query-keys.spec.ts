import { describe, expect, it } from 'vitest';
import { resourceAclKeys } from './query-keys';

describe('resourceAclKeys (tenant-aware)', () => {
  it('isole les clés par client actif (test imposé n°2)', () => {
    const a = resourceAclKeys.list('client-A', 'PROJECT', 'p1');
    const b = resourceAclKeys.list('client-B', 'PROJECT', 'p1');
    expect(a).not.toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('place activeClientId à l’index 1 du tableau', () => {
    const key = resourceAclKeys.list('client-42', 'BUDGET', 'b1');
    expect(key[0]).toBe('resource-acl');
    expect(key[1]).toBe('client-42');
    expect(key[2]).toBe('BUDGET');
    expect(key[3]).toBe('b1');
  });

  it('all(activeClientId) inclut activeClientId', () => {
    const key = resourceAclKeys.all('client-7');
    expect(key).toEqual(['resource-acl', 'client-7']);
  });

  it('signature force la présence de activeClientId à la compilation', () => {
    // @ts-expect-error - activeClientId est obligatoire
    resourceAclKeys.list(undefined, 'PROJECT', 'p1');
    // @ts-expect-error - activeClientId est obligatoire
    resourceAclKeys.list('client-A', 'PROJECT');
    // @ts-expect-error - all exige activeClientId
    resourceAclKeys.all();
    expect(true).toBe(true);
  });

  it('même client + même ressource → clé identique (cache stable)', () => {
    const a = resourceAclKeys.list('client-A', 'CONTRACT', 'c1');
    const b = resourceAclKeys.list('client-A', 'CONTRACT', 'c1');
    expect(a).toEqual(b);
  });

  it('même client + ressource différente → clés distinctes', () => {
    const a = resourceAclKeys.list('client-A', 'PROJECT', 'p1');
    const b = resourceAclKeys.list('client-A', 'PROJECT', 'p2');
    expect(a).not.toEqual(b);
  });

  it('même client + même resourceId mais resourceType différent → clés distinctes', () => {
    const a = resourceAclKeys.list('client-A', 'PROJECT', 'r1');
    const b = resourceAclKeys.list('client-A', 'BUDGET', 'r1');
    expect(a).not.toEqual(b);
  });
});
