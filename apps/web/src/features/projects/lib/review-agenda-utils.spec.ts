import { describe, expect, it } from 'vitest';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';
import {
  findNextOpenAgendaItemId,
  pickPreferredAgendaItemId,
  reviewAgendaConductProgress,
  sortReviewAgendaItems,
} from './review-agenda-utils';

function item(
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

describe('review-agenda-utils', () => {
  it('sortReviewAgendaItems trie par orderIndex', () => {
    const sorted = sortReviewAgendaItems([
      item({ id: 'b', title: 'B', orderIndex: 2 }),
      item({ id: 'a', title: 'A', orderIndex: 0 }),
      item({ id: 'c', title: 'C', orderIndex: 1 }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('reviewAgendaConductProgress compte les points traités et le courant', () => {
    const progress = reviewAgendaConductProgress([
      item({ id: '1', title: '1', orderIndex: 0, status: 'DONE' }),
      item({ id: '2', title: '2', orderIndex: 1, status: 'IN_PROGRESS' }),
      item({ id: '3', title: '3', orderIndex: 2, status: 'TODO' }),
    ]);
    expect(progress).toEqual({ total: 3, treated: 1, currentNumber: 2 });
  });

  it('pickPreferredAgendaItemId privilégie IN_PROGRESS puis TODO', () => {
    expect(
      pickPreferredAgendaItemId([
        item({ id: '1', title: '1', orderIndex: 0, status: 'DONE' }),
        item({ id: '2', title: '2', orderIndex: 1, status: 'IN_PROGRESS' }),
        item({ id: '3', title: '3', orderIndex: 2, status: 'TODO' }),
      ]),
    ).toBe('2');

    expect(
      pickPreferredAgendaItemId([
        item({ id: '1', title: '1', orderIndex: 0, status: 'DONE' }),
        item({ id: '3', title: '3', orderIndex: 1, status: 'TODO' }),
      ]),
    ).toBe('3');
  });

  it('findNextOpenAgendaItemId saute au prochain TODO', () => {
    expect(
      findNextOpenAgendaItemId(
        [
          item({ id: '1', title: '1', orderIndex: 0, status: 'DONE' }),
          item({ id: '2', title: '2', orderIndex: 1, status: 'DONE' }),
          item({ id: '3', title: '3', orderIndex: 2, status: 'TODO' }),
        ],
        '2',
      ),
    ).toBe('3');
  });
});
