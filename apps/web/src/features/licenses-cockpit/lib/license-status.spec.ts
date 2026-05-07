import { describe, expect, it } from 'vitest';
import {
  aggregateBillingDistribution,
  countExpirations,
  formatLicenseBadge,
  getBillingModeShortLabel,
  getLicenseDisplayLabel,
  getLicenseExpirationStatus,
  isModeWithExpiration,
} from './license-status';

const NOW = new Date('2026-05-07T12:00:00.000Z');

describe('license-status helpers — RFC-ACL-010', () => {
  describe('getLicenseDisplayLabel', () => {
    it('renders human-friendly labels per (type, mode)', () => {
      expect(getLicenseDisplayLabel('READ_ONLY', 'NON_BILLABLE')).toBe(
        'Lecture seule (illimitée)',
      );
      expect(getLicenseDisplayLabel('READ_WRITE', 'CLIENT_BILLABLE')).toBe(
        'Lecture/Écriture (facturable)',
      );
      expect(getLicenseDisplayLabel('READ_WRITE', 'EVALUATION')).toBe(
        'Évaluation 30 jours',
      );
      expect(getLicenseDisplayLabel('READ_WRITE', 'PLATFORM_INTERNAL')).toBe(
        'Support interne',
      );
      expect(getLicenseDisplayLabel('READ_WRITE', 'EXTERNAL_BILLABLE')).toBe(
        'Externe (porté hors client)',
      );
      expect(getLicenseDisplayLabel('READ_WRITE', 'NON_BILLABLE')).toBe(
        'Lecture/Écriture (geste commercial)',
      );
    });
  });

  describe('getBillingModeShortLabel', () => {
    it('keeps short, accessible labels', () => {
      expect(getBillingModeShortLabel('CLIENT_BILLABLE')).toBe('Facturable');
      expect(getBillingModeShortLabel('EVALUATION')).toBe('Évaluation');
      expect(getBillingModeShortLabel('PLATFORM_INTERNAL')).toBe(
        'Support interne',
      );
    });
  });

  describe('isModeWithExpiration', () => {
    it('flags only EVALUATION and PLATFORM_INTERNAL', () => {
      expect(isModeWithExpiration('EVALUATION')).toBe(true);
      expect(isModeWithExpiration('PLATFORM_INTERNAL')).toBe(true);
      expect(isModeWithExpiration('CLIENT_BILLABLE')).toBe(false);
      expect(isModeWithExpiration('NON_BILLABLE')).toBe(false);
    });
  });

  describe('getLicenseExpirationStatus', () => {
    it('returns expired when end date is in the past', () => {
      const s = getLicenseExpirationStatus(
        '2026-04-15T00:00:00.000Z',
        'EVALUATION',
        NOW,
      );
      expect(s.kind).toBe('expired');
      expect(s.humanLabel).toMatch(/expirée le/);
    });

    it('returns soon when end date is within 14 days', () => {
      const s = getLicenseExpirationStatus(
        '2026-05-15T00:00:00.000Z',
        'EVALUATION',
        NOW,
      );
      expect(s.kind).toBe('soon');
      expect(s.daysRemaining).toBeGreaterThan(0);
      expect(s.daysRemaining).toBeLessThanOrEqual(14);
      expect(s.humanLabel).toMatch(/expire dans/);
    });

    it('returns active when end date is far enough', () => {
      const s = getLicenseExpirationStatus(
        '2026-09-01T00:00:00.000Z',
        'PLATFORM_INTERNAL',
        NOW,
      );
      expect(s.kind).toBe('active');
      expect(s.humanLabel).toMatch(/expire le/);
    });

    it('returns none for missing end date', () => {
      const s = getLicenseExpirationStatus(null, 'EVALUATION', NOW);
      expect(s.kind).toBe('none');
      expect(s.daysRemaining).toBeNull();
    });
  });

  describe('formatLicenseBadge', () => {
    it('combines display label and expiration suffix for EVALUATION', () => {
      const badge = formatLicenseBadge({
        licenseType: 'READ_WRITE',
        licenseBillingMode: 'EVALUATION',
        licenseEndsAt: '2026-05-15T00:00:00.000Z',
      });
      expect(badge).toMatch(/Évaluation 30 jours/);
      expect(badge).toMatch(/expire dans/);
    });

    it('omits expiration suffix for modes without expiration', () => {
      const badge = formatLicenseBadge({
        licenseType: 'READ_WRITE',
        licenseBillingMode: 'CLIENT_BILLABLE',
        licenseEndsAt: null,
      });
      expect(badge).toBe('Lecture/Écriture (facturable)');
    });
  });

  describe('aggregateBillingDistribution', () => {
    it('counts each member once in the right bucket', () => {
      const dist = aggregateBillingDistribution([
        { licenseType: 'READ_ONLY', licenseBillingMode: 'NON_BILLABLE' },
        { licenseType: 'READ_ONLY', licenseBillingMode: 'NON_BILLABLE' },
        { licenseType: 'READ_WRITE', licenseBillingMode: 'CLIENT_BILLABLE' },
        { licenseType: 'READ_WRITE', licenseBillingMode: 'EVALUATION' },
        { licenseType: 'READ_WRITE', licenseBillingMode: 'PLATFORM_INTERNAL' },
        { licenseType: 'READ_WRITE', licenseBillingMode: 'EXTERNAL_BILLABLE' },
        { licenseType: 'READ_WRITE', licenseBillingMode: 'NON_BILLABLE' },
      ]);
      expect(dist).toEqual({
        readOnly: 2,
        clientBillable: 1,
        externalBillable: 1,
        nonBillable: 1,
        platformInternal: 1,
        evaluation: 1,
      });
    });
  });

  describe('countExpirations', () => {
    it('aggregates soon and expired counts only for relevant modes', () => {
      const counts = countExpirations(
        [
          {
            licenseType: 'READ_WRITE',
            licenseBillingMode: 'EVALUATION',
            licenseEndsAt: '2026-04-15T00:00:00.000Z',
          },
          {
            licenseType: 'READ_WRITE',
            licenseBillingMode: 'EVALUATION',
            licenseEndsAt: '2026-05-15T00:00:00.000Z',
          },
          {
            licenseType: 'READ_WRITE',
            licenseBillingMode: 'PLATFORM_INTERNAL',
            licenseEndsAt: '2026-05-10T00:00:00.000Z',
          },
          {
            licenseType: 'READ_WRITE',
            licenseBillingMode: 'CLIENT_BILLABLE',
            licenseEndsAt: '2026-05-08T00:00:00.000Z',
          },
        ],
        NOW,
      );
      expect(counts).toEqual({ soon: 2, expired: 1 });
    });
  });
});
