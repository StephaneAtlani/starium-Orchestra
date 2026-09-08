import { describe, expect, it } from 'vitest';
import {
  canPreviewDraftReviewReport,
  canPreviewOrSendReviewReport,
  canScheduleReview,
  canStartReview,
  hasReviewInvitationsSent,
  normalizeReviewStatus,
  reviewEditorInitialTab,
  reviewEditorPhase,
  reviewEditorTabsForPhase,
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

  it('autorise aperçu / envoi du compte rendu uniquement après finalisation', () => {
    expect(canPreviewOrSendReviewReport('FINALIZED')).toBe(true);
    expect(canPreviewOrSendReviewReport('IN_PROGRESS')).toBe(false);
    expect(canPreviewOrSendReviewReport('IN_REVIEW')).toBe(false);
    expect(canPreviewOrSendReviewReport('DRAFT')).toBe(false);
    expect(canPreviewOrSendReviewReport('SCHEDULED')).toBe(false);
    expect(canPreviewOrSendReviewReport('PREPARING')).toBe(false);
  });

  it('autorise l’aperçu brouillon en conduite ou figé', () => {
    expect(canPreviewDraftReviewReport('IN_PROGRESS')).toBe(true);
    expect(canPreviewDraftReviewReport('IN_REVIEW')).toBe(true);
    expect(canPreviewDraftReviewReport('DRAFT')).toBe(true);
    expect(canPreviewDraftReviewReport('FINALIZED')).toBe(true);
    expect(canPreviewDraftReviewReport('SCHEDULED')).toBe(false);
    expect(canPreviewDraftReviewReport('PREPARING')).toBe(false);
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

  it('reviewEditorPhase — préparation (PREPARING / SCHEDULED)', () => {
    expect(reviewEditorPhase('PREPARING', 'COPIL')).toBe('prepare');
    expect(reviewEditorPhase('DRAFT', 'COPIL')).toBe('prepare');
    expect(reviewEditorPhase('SCHEDULED', 'COMEX')).toBe('prepare');
    expect(reviewEditorPhase('PLANNED', 'COPIL')).toBe('prepare');
    expect(reviewEditorTabsForPhase('prepare')).toEqual([
      'prepare',
      'agenda',
      'participants',
      'attachments',
    ]);
    expect(reviewEditorInitialTab('prepare')).toBe('prepare');
  });

  it('reviewEditorPhase — conduite (IN_PROGRESS non-RETEX)', () => {
    expect(reviewEditorPhase('IN_PROGRESS', 'COPIL')).toBe('conduct');
    expect(reviewEditorPhase('IN_REVIEW', 'COMEX')).toBe('conduct');
    expect(reviewEditorTabsForPhase('conduct')).toEqual([
      'agenda',
      'participants',
      'decisions',
      'actions',
      'attachments',
      'closure',
    ]);
    expect(reviewEditorInitialTab('conduct')).toBe('agenda');
  });

  it('reviewEditorPhase — RETEX (POST_MORTEM éditable)', () => {
    expect(reviewEditorPhase('IN_PROGRESS', 'POST_MORTEM')).toBe('retex');
    expect(reviewEditorPhase('DRAFT', 'POST_MORTEM')).toBe('retex');
    expect(reviewEditorPhase('IN_REVIEW', 'POST_MORTEM')).toBe('retex');
    expect(reviewEditorPhase('PREPARING', 'POST_MORTEM')).toBe('prepare');
    expect(reviewEditorTabsForPhase('retex')).toEqual([
      'prepare',
      'participants',
      'attachments',
    ]);
    expect(reviewEditorInitialTab('retex')).toBe('prepare');
  });
});
