import { describe, expect, it } from 'vitest';
import {
  groupAgendaCandidateItems,
  groupProjectBudgetCycleItems,
  isAgendaCandidateItem,
} from './governance-cycle-agenda-candidates';
import type { GovernanceCycleItemResponseDto } from '../types/governance-cycle.types';

const base = {
  id: 'i1',
  cycleId: 'c1',
  title: 'Test',
  description: null,
  decisionReason: null,
  valueScore: null,
  riskScore: null,
  budgetScore: null,
  capacityScore: null,
  alignmentScore: null,
  priorityScore: null,
  estimatedBudgetAmount: null,
  estimatedCapacityDays: null,
  sourceRef: null,
  createdAt: '',
  updatedAt: '',
} as GovernanceCycleItemResponseDto;

describe('governance-cycle-agenda-candidates', () => {
  it('accepte projet/budget candidat uniquement', () => {
    expect(
      isAgendaCandidateItem({
        ...base,
        sourceType: 'PROJECT',
        decisionStatus: 'CANDIDATE',
      }),
    ).toBe(true);
    expect(
      isAgendaCandidateItem({
        ...base,
        sourceType: 'PROJECT',
        decisionStatus: 'ACCEPTED',
      }),
    ).toBe(false);
    expect(
      isAgendaCandidateItem({
        ...base,
        sourceType: 'MANUAL',
        decisionStatus: 'CANDIDATE',
      }),
    ).toBe(false);
  });

  it('groupe projets et budgets', () => {
    const grouped = groupAgendaCandidateItems([
      { ...base, id: 'p1', sourceType: 'PROJECT', decisionStatus: 'CANDIDATE' },
      { ...base, id: 'b1', sourceType: 'BUDGET', decisionStatus: 'CANDIDATE' },
      { ...base, id: 'm1', sourceType: 'MANUAL', decisionStatus: 'CANDIDATE' },
    ]);
    expect(grouped.projects).toHaveLength(1);
    expect(grouped.budgets).toHaveLength(1);
  });

  it('liste tous les projets et budgets pour la préparation', () => {
    const grouped = groupProjectBudgetCycleItems([
      { ...base, id: 'p1', sourceType: 'PROJECT', decisionStatus: 'ACCEPTED' },
      { ...base, id: 'b1', sourceType: 'BUDGET', decisionStatus: 'CANDIDATE' },
      { ...base, id: 'm1', sourceType: 'MANUAL', decisionStatus: 'CANDIDATE' },
    ]);
    expect(grouped.projects).toHaveLength(1);
    expect(grouped.budgets).toHaveLength(1);
  });
});
