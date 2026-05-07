import { describe, expect, it } from 'vitest';
import { licensesKeys } from './query-keys';

describe('licensesKeys', () => {
  it('isole les clés cache par client plateforme', () => {
    expect(licensesKeys.platformSubscriptions('c1')).toEqual([
      'licenses',
      'platform-subscriptions',
      'c1',
    ]);
    expect(licensesKeys.platformUsage('c1')).toEqual([
      'licenses',
      'platform-usage',
      'c1',
    ]);
  });

  it('isole les clés cache par client actif côté client', () => {
    expect(licensesKeys.clientUsage('active-client')).toEqual([
      'licenses',
      'client-usage',
      'active-client',
    ]);
  });
});
