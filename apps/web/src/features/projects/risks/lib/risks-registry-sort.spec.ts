import { describe, expect, it } from 'vitest';
import type { ProjectRiskApi } from '../../types/project.types';
import { sortRisksRegistryDefault } from './risks-registry-sort';

function risk(partial: Partial<ProjectRiskApi> & Pick<ProjectRiskApi, 'id' | 'title'>): ProjectRiskApi {
  const base: ProjectRiskApi = {
    id: 'rid',
    clientId: 'c1',
    projectId: 'p1',
    code: 'R-001',
    title: 'T',
    description: null,
    category: null,
    threatSource: '—',
    businessImpact: '—',
    likelihoodJustification: null,
    impactCategory: null,
    probability: 3,
    impact: 3,
    criticalityScore: 9,
    criticalityLevel: 'MEDIUM',
    mitigationPlan: null,
    contingencyPlan: null,
    ownerUserId: null,
    status: 'OPEN',
    reviewDate: null,
    dueDate: null,
    detectedAt: null,
    closedAt: null,
    sortOrder: 0,
    complianceRequirementId: null,
    riskTypeId: 'rt1',
    treatmentStrategy: 'REDUCE',
    residualJustification: null,
    complementaryTreatmentMeasures: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    residualRiskLevel: null,
  };
  return { ...base, ...partial };
}

describe('sortRisksRegistryDefault', () => {
  it('trie par criticité puis date la plus proche puis titre', () => {
    const now = Date.now();
    const soon = new Date(now + 86400000).toISOString();
    const later = new Date(now + 86400000 * 10).toISOString();

    const rows = [
      risk({
        id: 'a',
        title: 'Zebra',
        criticalityLevel: 'MEDIUM',
        reviewDate: later,
      }),
      risk({
        id: 'b',
        title: 'Alpha',
        criticalityLevel: 'HIGH',
        reviewDate: soon,
      }),
      risk({
        id: 'c',
        title: 'Beta',
        criticalityLevel: 'HIGH',
        reviewDate: later,
      }),
    ];

    const sorted = sortRisksRegistryDefault(rows);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});
