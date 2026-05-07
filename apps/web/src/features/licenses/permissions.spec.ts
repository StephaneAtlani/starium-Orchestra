import { describe, expect, it } from 'vitest';
import { licensesPermissionDependencies } from './permissions';

describe('licensesPermissionDependencies', () => {
  it('n’invente aucune permission string licenses/subscriptions', () => {
    expect(licensesPermissionDependencies).toEqual({
      subscriptionsRead: null,
      subscriptionsCreate: null,
      subscriptionsUpdate: null,
      subscriptionsTransition: null,
      licenseUsageRead: null,
      licenseAssignmentUpdate: null,
    });
  });
});
