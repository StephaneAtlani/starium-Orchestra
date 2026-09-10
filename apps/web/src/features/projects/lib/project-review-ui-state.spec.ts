import { describe, expect, it } from 'vitest';
import {
  ctaLabelForUiState,
  parsePointsStateParam,
  resolveReviewUiState,
} from './project-review-ui-state';

describe('project-review-ui-state (RFC-PROJ-013-7)', () => {
  it('maps SCHEDULED+locked to upcoming', () => {
    expect(
      resolveReviewUiState({
        status: 'SCHEDULED',
        agendaLockedAt: '2026-09-01T10:00:00.000Z',
      }),
    ).toBe('upcoming');
  });

  it('maps IN_PROGRESS+conductClosed to to_finalize', () => {
    expect(
      resolveReviewUiState({
        status: 'IN_PROGRESS',
        conductClosedAt: '2026-09-02T10:00:00.000Z',
      }),
    ).toBe('to_finalize');
  });

  it('CTA labels', () => {
    expect(ctaLabelForUiState('in_progress')).toBe('Reprendre la conduite');
    expect(ctaLabelForUiState('to_finalize')).toBe('Finaliser');
    expect(ctaLabelForUiState('history')).toBe('Consulter');
    expect(ctaLabelForUiState('to_prepare')).toBe('Ouvrir');
  });

  it('parsePointsStateParam defaults', () => {
    expect(parsePointsStateParam(null)).toBe('to_prepare');
    expect(parsePointsStateParam('series')).toBe('series');
    expect(parsePointsStateParam('nope')).toBe('to_prepare');
  });
});
