import { describe, expect, it } from 'vitest';
import type { ComplianceStatusRowApi } from '../api/compliance.api';
import { filterComplianceControls } from './compliance-controls-table';

function row(
  partial: Partial<ComplianceStatusRowApi> & { id: string } & {
    requirement?: Partial<ComplianceStatusRowApi['requirement']>;
  },
): ComplianceStatusRowApi {
  return {
    status: 'COMPLIANT',
    lastAssessmentDate: null,
    comment: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    requirementId: `req-${partial.id}`,
    ...partial,
    requirement: {
      id: `req-${partial.id}`,
      code: 'ART-30',
      title: 'Registre des traitements à jour',
      category: null,
      framework: { id: 'fw-1', name: 'RGPD', version: '2016/679' },
      ...partial.requirement,
    },
  };
}

describe('filterComplianceControls', () => {
  const rows = [
    row({ id: 'a' }),
    row({
      id: 'b',
      requirement: {
        id: 'req-b',
        code: 'DORA-24',
        title: 'Tests de résilience opérationnelle',
        category: 'Résilience',
        framework: { id: 'fw-2', name: 'DORA', version: '2022/2554' },
      },
    }),
  ];

  it('renvoie tout quand la recherche est vide', () => {
    expect(filterComplianceControls(rows, '')).toHaveLength(2);
    expect(filterComplianceControls(rows, '   ')).toHaveLength(2);
  });

  it('filtre sur le titre, sans sensibilité à la casse', () => {
    const result = filterComplianceControls(rows, 'RÉSILIENCE');
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('filtre sur le code de l’exigence', () => {
    expect(filterComplianceControls(rows, 'art-30').map((r) => r.id)).toEqual(['a']);
  });

  it('filtre sur le nom du référentiel', () => {
    expect(filterComplianceControls(rows, 'dora').map((r) => r.id)).toEqual(['b']);
  });

  it('renvoie un tableau vide si rien ne correspond', () => {
    expect(filterComplianceControls(rows, 'introuvable')).toEqual([]);
  });
});
