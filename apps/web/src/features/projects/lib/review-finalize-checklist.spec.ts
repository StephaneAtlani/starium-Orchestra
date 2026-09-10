import { describe, expect, it } from 'vitest';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';
import { buildFinalizeChecklist } from './review-finalize-checklist';

function agenda(
  partial: Partial<ProjectReviewAgendaItemApi> & Pick<ProjectReviewAgendaItemApi, 'id' | 'title'>,
): ProjectReviewAgendaItemApi {
  return {
    description: null,
    itemType: 'INFORMATION',
    objective: null,
    expectedDecision: null,
    orderIndex: 0,
    plannedDurationMinutes: null,
    ownerUserId: null,
    ownerDisplayName: null,
    status: 'TODO',
    notes: null,
    decisionSummary: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('buildFinalizeChecklist', () => {
  it('compte arbitrages sans verdict et actions incomplètes', () => {
    const result = buildFinalizeChecklist({
      agendaItems: [
        agenda({
          id: 'arb1',
          title: 'Arbitrage',
          itemType: 'ARBITRATION',
          decisionSummary: null,
        }),
        agenda({
          id: 'arb2',
          title: 'Tranché',
          itemType: 'ARBITRATION',
          decisionSummary: 'OK',
        }),
      ],
      decisions: [{ agendaItemId: 'arb2' }],
      actions: [
        {
          title: 'Sans porteur',
          status: 'TODO',
          dueDate: '2026-10-01T10:00',
          responsibleUserId: '',
          linkedTaskId: '',
        },
        {
          title: 'Complète',
          status: 'TODO',
          dueDate: '2026-10-01T10:00',
          responsibleUserId: 'u1',
          linkedTaskId: '',
        },
      ],
    });
    expect(result.openArbitrationsWithoutVerdictCount).toBe(1);
    expect(result.openActionsWithoutOwnerOrDueCount).toBe(1);
  });

  it('liste candidats push tâches et notes risque', () => {
    const result = buildFinalizeChecklist({
      agendaItems: [
        agenda({
          id: '1',
          title: 'R',
          notes: 'Risque : Fuite\nRisque : Fuite\nNote',
        }),
      ],
      decisions: [],
      actions: [
        {
          title: 'À créer',
          status: 'TODO',
          dueDate: '',
          responsibleUserId: '',
          linkedTaskId: '',
        },
        {
          title: 'Liée',
          status: 'TODO',
          dueDate: '',
          responsibleUserId: '',
          linkedTaskId: 't1',
        },
      ],
    });
    expect(result.eligibleActionTitles).toEqual(['À créer']);
    expect(result.riskNoteTitles).toEqual(['Fuite']);
  });
});
