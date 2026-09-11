import {
  buildDescentAgendaDescription,
  canInjectIntoTargetAgenda,
  resolveNextCoproTarget,
} from './project-review-descents';

describe('project-review-descents helpers', () => {
  describe('resolveNextCoproTarget', () => {
    const d = (iso: string) => new Date(iso);

    it('choisit la date la plus proche ≥ source', () => {
      const picked = resolveNextCoproTarget(
        [
          { id: 'a', reviewDate: d('2026-09-01'), agendaLockedAt: null, title: 'A' },
          { id: 'b', reviewDate: d('2026-09-15'), agendaLockedAt: null, title: 'B' },
          { id: 'c', reviewDate: d('2026-10-01'), agendaLockedAt: null, title: 'C' },
        ],
        d('2026-09-10'),
      );
      expect(picked?.id).toBe('b');
    });

    it('repli sur un COPRO sans date si aucun daté', () => {
      const picked = resolveNextCoproTarget(
        [{ id: 'x', reviewDate: null, agendaLockedAt: null, title: null }],
        d('2026-09-10'),
      );
      expect(picked?.id).toBe('x');
    });

    it('retourne null si vide', () => {
      expect(resolveNextCoproTarget([], null)).toBeNull();
    });
  });

  describe('canInjectIntoTargetAgenda', () => {
    it('refuse si ODJ figé', () => {
      expect(canInjectIntoTargetAgenda(new Date())).toBe(false);
      expect(canInjectIntoTargetAgenda(null)).toBe(true);
    });
  });

  describe('buildDescentAgendaDescription', () => {
    it('assemble Descente depuis {COPIL} · {date}', () => {
      const text = buildDescentAgendaDescription({
        sourceReviewTitle: 'COPIL septembre',
        sourceReviewDateLabel: '10/09/2026',
        summary: 'Décision budget validée',
      });
      expect(text).toContain('Descente depuis COPIL septembre · 10/09/2026');
      expect(text).toContain('Décision budget validée');
    });

    it('omets la date si absente', () => {
      const text = buildDescentAgendaDescription({
        sourceReviewTitle: 'COPIL',
        sourceReviewDateLabel: null,
        summary: null,
      });
      expect(text).toBe('Descente depuis COPIL');
    });
  });
});
