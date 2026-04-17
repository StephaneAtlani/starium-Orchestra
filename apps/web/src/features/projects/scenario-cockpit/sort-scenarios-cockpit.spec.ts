import { describe, expect, it } from 'vitest';
import type { ProjectScenarioApi } from '../types/project.types';
import { resolveDefaultComparedId, sortScenariosForCockpit } from './sort-scenarios-cockpit';

function sc(
  partial: Partial<ProjectScenarioApi> & Pick<ProjectScenarioApi, 'id' | 'name' | 'status' | 'createdAt'>,
): ProjectScenarioApi {
  return {
    clientId: 'c1',
    projectId: 'p1',
    code: null,
    description: null,
    assumptionSummary: null,
    version: 1,
    isBaseline: false,
    selectedAt: null,
    selectedByUserId: null,
    archivedAt: null,
    updatedAt: partial.createdAt,
    budgetSummary: null,
    resourceSummary: null,
    timelineSummary: null,
    capacitySummary: null,
    riskSummary: null,
    ...partial,
  };
}

describe('sortScenariosForCockpit', () => {
  it('exclut ARCHIVED et trie par createdAt DESC (ordre API volontairement perturbé)', () => {
    const items = [
      sc({
        id: 'a',
        name: 'A',
        status: 'DRAFT',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      sc({
        id: 'b',
        name: 'B',
        status: 'DRAFT',
        createdAt: '2024-06-01T00:00:00.000Z',
      }),
      sc({
        id: 'z',
        name: 'Z',
        status: 'ARCHIVED',
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    const sorted = sortScenariosForCockpit(items);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('retourne le premier comparé ≠ baseline après tri', () => {
    const items = [
      sc({
        id: 'base',
        name: 'Base',
        status: 'SELECTED',
        createdAt: '2024-06-01T00:00:00.000Z',
      }),
      sc({
        id: 'older',
        name: 'Older',
        status: 'DRAFT',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ];
    const sorted = sortScenariosForCockpit(items);
    expect(resolveDefaultComparedId(sorted, 'base')).toBe('older');
  });

  it('retourne null si seul scénario non archivé = baseline', () => {
    const items = [
      sc({
        id: 'only',
        name: 'Only',
        status: 'SELECTED',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ];
    const sorted = sortScenariosForCockpit(items);
    expect(resolveDefaultComparedId(sorted, 'only')).toBe(null);
  });
});
