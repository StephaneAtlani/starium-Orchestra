import {
  resolveReviewUiState,
  type ResolveReviewUiStateInput,
} from './project-review-ui-state';
import { ProjectReviewStatus } from '@prisma/client';

describe('resolveReviewUiState (RFC-PROJ-013-7)', () => {
  const locked = new Date('2026-09-01T10:00:00Z');
  const closed = new Date('2026-09-02T10:00:00Z');

  const cases: Array<{
    name: string;
    input: ResolveReviewUiStateInput;
    expected: ReturnType<typeof resolveReviewUiState>;
  }> = [
    {
      name: 'PREPARING unlocked → to_prepare',
      input: { status: ProjectReviewStatus.PREPARING, agendaLockedAt: null },
      expected: 'to_prepare',
    },
    {
      name: 'SCHEDULED unlocked → to_prepare',
      input: { status: ProjectReviewStatus.SCHEDULED, agendaLockedAt: null },
      expected: 'to_prepare',
    },
    {
      name: 'SCHEDULED locked → upcoming',
      input: { status: ProjectReviewStatus.SCHEDULED, agendaLockedAt: locked },
      expected: 'upcoming',
    },
    {
      name: 'PREPARING locked → to_prepare (lock alone does not schedule)',
      input: { status: ProjectReviewStatus.PREPARING, agendaLockedAt: locked },
      expected: 'to_prepare',
    },
    {
      name: 'IN_PROGRESS open → in_progress',
      input: {
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: null,
      },
      expected: 'in_progress',
    },
    {
      name: 'IN_PROGRESS closed → to_finalize',
      input: {
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: closed,
      },
      expected: 'to_finalize',
    },
    {
      name: 'FINALIZED → history',
      input: { status: ProjectReviewStatus.FINALIZED },
      expected: 'history',
    },
    {
      name: 'CANCELLED → history',
      input: { status: ProjectReviewStatus.CANCELLED },
      expected: 'history',
    },
    {
      name: 'PLANNED unlocked → to_prepare',
      input: { status: ProjectReviewStatus.PLANNED, agendaLockedAt: null },
      expected: 'to_prepare',
    },
    {
      name: 'PLANNED locked → upcoming',
      input: { status: ProjectReviewStatus.PLANNED, agendaLockedAt: locked },
      expected: 'upcoming',
    },
    {
      name: 'IN_REVIEW open → in_progress',
      input: { status: ProjectReviewStatus.IN_REVIEW, conductClosedAt: null },
      expected: 'in_progress',
    },
    {
      name: 'DRAFT without startedAt → to_prepare',
      input: { status: ProjectReviewStatus.DRAFT, startedAt: null },
      expected: 'to_prepare',
    },
    {
      name: 'DRAFT with startedAt → in_progress',
      input: {
        status: ProjectReviewStatus.DRAFT,
        startedAt: locked,
        conductClosedAt: null,
      },
      expected: 'in_progress',
    },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    expect(resolveReviewUiState(input)).toBe(expected);
  });
});
