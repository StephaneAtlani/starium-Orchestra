import { describe, expect, it } from 'vitest';
import {
  canUseClientLicenseQuickActions,
  canUsePlatformLicenseQuickActions,
} from './license-quick-actions-policy';

describe('license-quick-actions-policy — RFC-ACL-010 fallback rôle', () => {
  it('grants client quick-actions only to CLIENT_ADMIN of active client', () => {
    expect(canUseClientLicenseQuickActions({ role: 'CLIENT_ADMIN' })).toBe(true);
    expect(canUseClientLicenseQuickActions({ role: 'CLIENT_USER' })).toBe(false);
    expect(canUseClientLicenseQuickActions({ role: null })).toBe(false);
    expect(canUseClientLicenseQuickActions(null)).toBe(false);
  });

  it('grants platform quick-actions only to PLATFORM_ADMIN', () => {
    expect(
      canUsePlatformLicenseQuickActions({ platformRole: 'PLATFORM_ADMIN' }),
    ).toBe(true);
    expect(canUsePlatformLicenseQuickActions({ platformRole: 'USER' })).toBe(
      false,
    );
    expect(canUsePlatformLicenseQuickActions({ platformRole: null })).toBe(
      false,
    );
    expect(canUsePlatformLicenseQuickActions(null)).toBe(false);
  });
});
