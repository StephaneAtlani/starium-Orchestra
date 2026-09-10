import { describe, expect, it } from 'vitest';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';
import {
  canAdvanceAgendaPoint,
  findNextOpenAgendaItemId,
  formatConductElapsed,
  pickPreferredAgendaItemId,
  reviewAgendaConductProgress,
  shouldShowAnimateSession,
  shouldTickPointTimer,
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

  it('canAdvanceAgendaPoint uniquement DONE/SKIPPED', () => {
    expect(canAdvanceAgendaPoint('DONE')).toBe(true);
    expect(canAdvanceAgendaPoint('SKIPPED')).toBe(true);
    expect(canAdvanceAgendaPoint('IN_PROGRESS')).toBe(false);
    expect(canAdvanceAgendaPoint('TODO')).toBe(false);
  });

  it('shouldTickPointTimer pour TODO et IN_PROGRESS', () => {
    expect(shouldTickPointTimer('TODO')).toBe(true);
    expect(shouldTickPointTimer('IN_PROGRESS')).toBe(true);
    expect(shouldTickPointTimer('DONE')).toBe(false);
  });

  it('formatConductElapsed formate mm:ss', () => {
    expect(formatConductElapsed(0)).toBe('00:00');
    expect(formatConductElapsed(65)).toBe('01:05');
    expect(formatConductElapsed(-3)).toBe('00:00');
  });

  it('shouldShowAnimateSession gate close-conduct et REX', () => {
    expect(
      shouldShowAnimateSession({
        editorPhase: 'conduct',
        conductClosedAt: null,
        reviewType: 'COPIL',
      }),
    ).toBe(true);
    expect(
      shouldShowAnimateSession({
        editorPhase: 'conduct',
        conductClosedAt: '2026-09-10T12:00:00.000Z',
        reviewType: 'COPIL',
      }),
    ).toBe(false);
    expect(
      shouldShowAnimateSession({
        editorPhase: 'conduct',
        conductClosedAt: null,
        reviewType: 'POST_MORTEM',
      }),
    ).toBe(false);
    expect(
      shouldShowAnimateSession({
        editorPhase: 'prepare',
        conductClosedAt: null,
        reviewType: 'COPIL',
      }),
    ).toBe(false);
  });
});
