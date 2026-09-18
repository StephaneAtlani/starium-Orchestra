import { describe, expect, it } from 'vitest';
import type { ComplianceFrameworkOverviewApi } from '../api/compliance.api';
import {
  normalizeScopeDomainKeys,
  requirementDomainKey,
  scopeComplianceOverview,
} from './compliance-campaign-scope';

function overviewFixture(): ComplianceFrameworkOverviewApi {
  return {
    framework: {
      id: 'fw1',
      name: 'ISO',
      version: '2022',
      isActive: true,
      nextAuditAt: null,
    },
    requirementCount: 4,
    compliantCount: 1,
    partiallyCompliantCount: 1,
    nonCompliantCount: 1,
    notApplicableCount: 0,
    notAssessedCount: 1,
    applicableCount: 3,
    compliancePercent: 33,
    domains: [
      {
        key: 'A.5',
        label: 'A.5 · Org',
        requirementCount: 2,
        compliantCount: 1,
        partiallyCompliantCount: 0,
        nonCompliantCount: 0,
        notApplicableCount: 0,
        notAssessedCount: 1,
        applicableCount: 1,
        compliancePercent: 100,
      },
      {
        key: 'A.6',
        label: 'A.6 · People',
        requirementCount: 2,
        compliantCount: 0,
        partiallyCompliantCount: 1,
        nonCompliantCount: 1,
        notApplicableCount: 0,
        notAssessedCount: 0,
        applicableCount: 2,
        compliancePercent: 0,
      },
    ],
    requirements: [
      {
        id: 'r1',
        code: 'A.5.1',
        title: 'Policies',
        category: 'A.5',
        status: 'COMPLIANT',
        evidenceCount: 1,
        linkedRiskCount: 0,
      },
      {
        id: 'r2',
        code: 'A.5.2',
        title: 'Roles',
        category: 'A.5',
        status: 'NOT_ASSESSED',
        evidenceCount: 0,
        linkedRiskCount: 0,
      },
      {
        id: 'r3',
        code: 'A.6.1',
        title: 'Screening',
        category: 'A.6',
        status: 'PARTIALLY_COMPLIANT',
        evidenceCount: 0,
        linkedRiskCount: 0,
      },
      {
        id: 'r4',
        code: 'A.6.2',
        title: 'Terms',
        category: 'A.6',
        status: 'NON_COMPLIANT',
        evidenceCount: 0,
        linkedRiskCount: 1,
      },
    ],
    remediation: [
      {
        id: 'r3',
        code: 'A.6.1',
        title: 'Screening',
        category: 'A.6',
        status: 'PARTIALLY_COMPLIANT',
        evidenceCount: 0,
        linkedRiskCount: 0,
      },
      {
        id: 'r4',
        code: 'A.6.2',
        title: 'Terms',
        category: 'A.6',
        status: 'NON_COMPLIANT',
        evidenceCount: 0,
        linkedRiskCount: 1,
      },
    ],
  };
}

describe('compliance-campaign-scope', () => {
  it('normalizeScopeDomainKeys ignore le vide', () => {
    expect(normalizeScopeDomainKeys(null)).toBeNull();
    expect(normalizeScopeDomainKeys([])).toBeNull();
    expect(normalizeScopeDomainKeys(['A.5', '  '])).toEqual(['A.5']);
  });

  it('requirementDomainKey mappe l’absence de catégorie', () => {
    expect(requirementDomainKey(null)).toBe('__uncategorized__');
    expect(requirementDomainKey('  A.5  ')).toBe('A.5');
  });

  it('scopeComplianceOverview filtre et recalcule C/A', () => {
    const scoped = scopeComplianceOverview(overviewFixture(), ['A.5']);
    expect(scoped.domains).toHaveLength(1);
    expect(scoped.requirements).toHaveLength(2);
    expect(scoped.remediation).toHaveLength(0);
    expect(scoped.requirementCount).toBe(2);
    expect(scoped.compliantCount).toBe(1);
    expect(scoped.notAssessedCount).toBe(1);
    expect(scoped.applicableCount).toBe(1);
    expect(scoped.compliancePercent).toBe(100);
  });

  it('scope null = overview intacte', () => {
    const src = overviewFixture();
    expect(scopeComplianceOverview(src, null)).toBe(src);
  });
});
