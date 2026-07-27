import { describe, expect, it } from 'vitest';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import { selectRisksToArbitrate } from './risks-registry-watchlist';

function row(partial: Partial<ProjectRiskRegistryRow> & { id: string }): ProjectRiskRegistryRow {
  return {
    clientId: 'c1',
    projectId: 'p1',
    code: 'R-001',
    title: `Risque ${partial.id}`,
    description: null,
    category: null,
    fearedEvent: '—',
    threatSource: '—',
    businessImpact: '—',
    existingSecurityMeasures: null,
    likelihoodJustification: null,
    impactCategory: null,
    riskTypeId: 'rt1',
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
    treatmentStrategy: 'REDUCE',
    residualRiskLevel: null,
    residualJustification: null,
    complementaryTreatmentMeasures: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    projectName: 'Projet',
    ownerDisplayLabel: 'Non assigné',
    ...partial,
  };
}

describe('selectRisksToArbitrate', () => {
  it('ne retient que les risques non clôturés de niveau haut ou critique', () => {
    const result = selectRisksToArbitrate([
      row({ id: 'a', criticalityLevel: 'CRITICAL', status: 'OPEN' }),
      row({ id: 'b', criticalityLevel: 'HIGH', status: 'MONITORED' }),
      row({ id: 'c', criticalityLevel: 'MEDIUM', status: 'OPEN' }),
      row({ id: 'd', criticalityLevel: 'LOW', status: 'OPEN' }),
      row({ id: 'e', criticalityLevel: 'CRITICAL', status: 'CLOSED' }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('classe critique avant haut, puis par score décroissant', () => {
    const result = selectRisksToArbitrate([
      row({ id: 'high-20', criticalityLevel: 'HIGH', criticalityScore: 12 }),
      row({ id: 'crit-low', criticalityLevel: 'CRITICAL', criticalityScore: 20 }),
      row({ id: 'crit-high', criticalityLevel: 'CRITICAL', criticalityScore: 25 }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['crit-high', 'crit-low', 'high-20']);
  });

  it('à criticité et score égaux, place l’échéance la plus proche en tête', () => {
    const result = selectRisksToArbitrate([
      row({ id: 'sans-echeance', criticalityLevel: 'CRITICAL', criticalityScore: 25, dueDate: null }),
      row({
        id: 'tard',
        criticalityLevel: 'CRITICAL',
        criticalityScore: 25,
        dueDate: '2026-12-01T00:00:00.000Z',
      }),
      row({
        id: 'tot',
        criticalityLevel: 'CRITICAL',
        criticalityScore: 25,
        dueDate: '2026-02-01T00:00:00.000Z',
      }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['tot', 'tard', 'sans-echeance']);
  });

  it('ne modifie pas le tableau source', () => {
    const rows = [
      row({ id: 'b', criticalityLevel: 'HIGH', criticalityScore: 12 }),
      row({ id: 'a', criticalityLevel: 'CRITICAL', criticalityScore: 25 }),
    ];
    selectRisksToArbitrate(rows);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
