import { describe, expect, it } from 'vitest';
import { toEffectiveRightsRows } from './effective-rights-matrix';

describe('effective-rights-matrix', () => {
  it('retourne une ligne par couche dans l’ordre attendu', () => {
    const rows = toEffectiveRightsRows({
      licenseCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      subscriptionCheck: { status: 'not_applicable', reasonCode: null, message: 'na' },
      moduleActivationCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      moduleVisibilityCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      rbacCheck: {
        status: 'fail',
        reasonCode: 'RBAC_PERMISSION_MISSING',
        message: 'no',
      },
      aclCheck: { status: 'not_applicable', reasonCode: null, message: 'na' },
      finalDecision: 'denied',
      denialReasons: [
        { layer: 'rbacCheck', reasonCode: 'RBAC_PERMISSION_MISSING', message: 'no' },
      ],
      computedAt: new Date().toISOString(),
    });

    expect(rows.map((r) => r.key)).toEqual([
      'licenseCheck',
      'subscriptionCheck',
      'moduleActivationCheck',
      'moduleVisibilityCheck',
      'rbacCheck',
      'aclCheck',
    ]);
    expect(rows[4]?.reasonCode).toBe('RBAC_PERMISSION_MISSING');
  });
});
