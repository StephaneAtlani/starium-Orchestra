import { describe, expect, it } from 'vitest';
import type { ComplianceRequirementRowApi } from '../api/compliance.api';
import {
  buildFrameworkOptions,
  filterComplianceRequirements,
  requirementUiStatus,
  summarizeRequirements,
} from './compliance-requirements-list';

function row(
  partial: Partial<ComplianceRequirementRowApi> & { id: string },
): ComplianceRequirementRowApi {
  return {
    code: 'A.5.1',
    title: 'Politique de sécurité',
    category: null,
    framework: {
      id: 'fw-iso',
      name: 'ISO 27001',
      version: '2022',
      isActive: true,
    },
    statuses: [],
    evidences: [],
    ...partial,
  };
}

describe('requirementUiStatus', () => {
  it('renvoie NOT_ASSESSED si aucun statut', () => {
    expect(requirementUiStatus(row({ id: '1' }))).toBe('NOT_ASSESSED');
  });

  it('prend le premier statut connu', () => {
    expect(
      requirementUiStatus(
        row({ id: '1', statuses: [{ status: 'NON_COMPLIANT' }] }),
      ),
    ).toBe('NON_COMPLIANT');
  });
});

describe('filterComplianceRequirements', () => {
  const rows = [
    row({ id: 'a' }),
    row({
      id: 'b',
      code: 'DORA-24',
      title: 'Tests de résilience',
      statuses: [{ status: 'COMPLIANT' }],
      framework: {
        id: 'fw-dora',
        name: 'DORA',
        version: '2022/2554',
        isActive: true,
      },
      evidences: [{ id: 'e1' }],
    }),
    row({
      id: 'c',
      code: 'A.8.1',
      title: 'Gestion des actifs',
      statuses: [{ status: 'NON_COMPLIANT' }],
    }),
  ];

  it('filtre par référentiel (id interne, libellé affiché ailleurs)', () => {
    expect(
      filterComplianceRequirements(rows, {
        search: '',
        frameworkId: 'fw-dora',
        status: 'ALL',
      }).map((r) => r.id),
    ).toEqual(['b']);
  });

  it('filtre par état Non évalué', () => {
    expect(
      filterComplianceRequirements(rows, {
        search: '',
        frameworkId: 'ALL',
        status: 'NOT_ASSESSED',
      }).map((r) => r.id),
    ).toEqual(['a']);
  });

  it('filtre plein texte sur le titre', () => {
    expect(
      filterComplianceRequirements(rows, {
        search: 'résilience',
        frameworkId: 'ALL',
        status: 'ALL',
      }).map((r) => r.id),
    ).toEqual(['b']);
  });

  it('combine référentiel + statut', () => {
    expect(
      filterComplianceRequirements(rows, {
        search: '',
        frameworkId: 'fw-iso',
        status: 'NON_COMPLIANT',
      }).map((r) => r.id),
    ).toEqual(['c']);
  });
});

describe('buildFrameworkOptions', () => {
  it('déduplique et labellise name + version', () => {
    const opts = buildFrameworkOptions([
      row({ id: '1' }),
      row({ id: '2', code: 'A.5.2' }),
      row({
        id: '3',
        framework: {
          id: 'fw-dora',
          name: 'DORA',
          version: '2022/2554',
          isActive: true,
        },
      }),
    ]);
    expect(opts).toEqual([
      { id: 'fw-dora', label: 'DORA · 2022/2554' },
      { id: 'fw-iso', label: 'ISO 27001 · 2022' },
    ]);
  });
});

describe('summarizeRequirements', () => {
  it('compte les états', () => {
    expect(
      summarizeRequirements([
        row({ id: '1' }),
        row({ id: '2', statuses: [{ status: 'NON_COMPLIANT' }] }),
        row({ id: '3', statuses: [{ status: 'COMPLIANT' }] }),
        row({ id: '4', statuses: [{ status: 'PARTIALLY_COMPLIANT' }] }),
      ]),
    ).toEqual({
      total: 4,
      notAssessed: 1,
      gaps: 1,
      partial: 1,
      compliant: 1,
    });
  });
});
