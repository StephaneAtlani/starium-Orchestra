import {
  buildEscalationAgendaDescription,
  canInjectIntoTargetAgenda,
  resolveNextCopilTarget,
  reviewTitleLabel,
} from './project-review-escalations';
import { ProjectReviewType } from '@prisma/client';

describe('project-review-escalations helpers', () => {
  describe('resolveNextCopilTarget', () => {
    const d = (iso: string) => new Date(iso);

    it('choisit la date la plus proche ≥ source', () => {
      const picked = resolveNextCopilTarget(
        [
          { id: 'a', reviewDate: d('2026-09-01'), agendaLockedAt: null, title: 'A' },
          { id: 'b', reviewDate: d('2026-09-15'), agendaLockedAt: null, title: 'B' },
          { id: 'c', reviewDate: d('2026-10-01'), agendaLockedAt: null, title: 'C' },
        ],
        d('2026-09-10'),
      );
      expect(picked?.id).toBe('b');
    });

    it('repli sur un COPIL sans date si aucun daté', () => {
      const picked = resolveNextCopilTarget(
        [{ id: 'x', reviewDate: null, agendaLockedAt: null, title: null }],
        d('2026-09-10'),
      );
      expect(picked?.id).toBe('x');
    });

    it('retourne null si vide', () => {
      expect(resolveNextCopilTarget([], null)).toBeNull();
    });
  });

  describe('canInjectIntoTargetAgenda', () => {
    it('refuse si ODJ figé', () => {
      expect(canInjectIntoTargetAgenda(new Date())).toBe(false);
      expect(canInjectIntoTargetAgenda(null)).toBe(true);
    });
  });

  describe('buildEscalationAgendaDescription', () => {
    it('assemble le contexte métier', () => {
      const text = buildEscalationAgendaDescription({
        sourceReviewTitle: 'COPROJ septembre',
        sourceReviewDateLabel: '10/09/2026',
        sourceAgendaTitle: 'Budget dépassé',
        summary: 'À arbitrer en COPIL',
      });
      expect(text).toContain('Remontée depuis COPROJ septembre');
      expect(text).toContain('Séance du 10/09/2026');
      expect(text).toContain('Point d’origine : Budget dépassé');
      expect(text).toContain('À arbitrer en COPIL');
    });
  });

  describe('reviewTitleLabel', () => {
    it('préfère le titre puis le type métier', () => {
      expect(reviewTitleLabel('Mon point', ProjectReviewType.COPRO)).toBe(
        'Mon point',
      );
      expect(reviewTitleLabel(null, ProjectReviewType.COPRO)).toBe('COPROJ');
      expect(reviewTitleLabel('  ', ProjectReviewType.COPIL)).toBe('COPIL');
    });
  });
});
