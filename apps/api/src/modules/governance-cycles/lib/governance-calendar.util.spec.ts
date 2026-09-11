import {
  cycleInstanceCalendarTitle,
  filterEventsByAuthorizedProjectIds,
  isDateInInclusiveRange,
  parseCalendarRange,
  projectReviewCalendarTitle,
  projectReviewTypeLabel,
} from './governance-calendar.util';

describe('governance-calendar.util', () => {
  describe('parseCalendarRange', () => {
    it('accepte une fenêtre valide', () => {
      const result = parseCalendarRange(
        '2026-09-01T00:00:00.000Z',
        '2026-09-30T23:59:59.999Z',
      );
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.from.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(result.to.toISOString()).toBe('2026-09-30T23:59:59.999Z');
    });

    it('refuse from > to', () => {
      const result = parseCalendarRange(
        '2026-10-01T00:00:00.000Z',
        '2026-09-01T00:00:00.000Z',
      );
      expect(result).toEqual({
        error: 'from must be less than or equal to to',
      });
    });
  });

  describe('isDateInInclusiveRange', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-30T23:59:59.999Z');

    it('inclut les bornes', () => {
      expect(isDateInInclusiveRange(from, from, to)).toBe(true);
      expect(isDateInInclusiveRange(to, from, to)).toBe(true);
    });

    it('exclut hors fenêtre', () => {
      expect(
        isDateInInclusiveRange(new Date('2026-08-31T23:59:59.999Z'), from, to),
      ).toBe(false);
      expect(
        isDateInInclusiveRange(new Date('2026-10-01T00:00:00.000Z'), from, to),
      ).toBe(false);
    });
  });

  describe('filterEventsByAuthorizedProjectIds', () => {
    it('garde les instances et filtre les reviews hors projets autorisés', () => {
      const items = [
        { kind: 'CYCLE_INSTANCE', projectId: null },
        { kind: 'PROJECT_REVIEW', projectId: 'p1' },
        { kind: 'PROJECT_REVIEW', projectId: 'p2' },
        { kind: 'PROJECT_REVIEW', projectId: null },
      ];
      const filtered = filterEventsByAuthorizedProjectIds(
        items,
        new Set(['p1']),
      );
      expect(filtered).toEqual([
        { kind: 'CYCLE_INSTANCE', projectId: null },
        { kind: 'PROJECT_REVIEW', projectId: 'p1' },
      ]);
    });
  });

  describe('labels', () => {
    it('ne renvoie jamais un ID brut', () => {
      expect(projectReviewTypeLabel('COPRO')).toBe('Point COPRO');
      expect(
        projectReviewCalendarTitle({
          title: null,
          reviewType: 'COPIL',
          projectName: 'Migration ERP',
        }),
      ).toBe('Point COPIL — Migration ERP');
      expect(
        cycleInstanceCalendarTitle({
          label: null,
          periodLabel: 'T2',
          cycleName: 'CODIR',
        }),
      ).toBe('CODIR — T2');
    });
  });
});
