import { describe, expect, it } from 'vitest';
import {
  canScheduleReview,
  canStartReview,
  hasReviewInvitationsSent,
  normalizeReviewStatus,
} from './project-review-status';

describe('project-review-status', () => {
  it('normalise les statuts legacy', () => {
    expect(normalizeReviewStatus('DRAFT')).toBe('PREPARING');
    expect(normalizeReviewStatus('PLANNED')).toBe('SCHEDULED');
    expect(normalizeReviewStatus('IN_REVIEW')).toBe('IN_PROGRESS');
  });

  it('sépare planifier et démarrer selon le cycle PREPARING → SCHEDULED → IN_PROGRESS', () => {
    expect(canScheduleReview('PREPARING')).toBe(true);
    expect(canScheduleReview('DRAFT')).toBe(true);
    expect(canScheduleReview('SCHEDULED')).toBe(false);

    expect(canStartReview('SCHEDULED')).toBe(true);
    expect(canStartReview('PLANNED')).toBe(true);
    expect(canStartReview('PREPARING')).toBe(false);
    expect(canStartReview('IN_PROGRESS')).toBe(false);
  });

  it('détecte si des invitations ont déjà été envoyées', () => {
    expect(hasReviewInvitationsSent([])).toBe(false);
    expect(
      hasReviewInvitationsSent([
        { lastInvitedAt: null } as never,
        { lastInvitedAt: '2026-07-14T10:00:00.000Z' } as never,
      ]),
    ).toBe(true);
  });
});
