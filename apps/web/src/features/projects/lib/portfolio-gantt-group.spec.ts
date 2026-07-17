import { describe, expect, it } from 'vitest';
import { groupPortfolioGanttByTag } from './portfolio-gantt-group';
import type { PortfolioGanttRow } from '../types/project.types';

function row(
  id: string,
  tags: Array<{ id: string; name: string; color: string | null }>,
): PortfolioGanttRow {
  return {
    id,
    code: id,
    name: `Projet ${id}`,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    criticality: 'MEDIUM',
    kind: 'PROJECT',
    startDate: null,
    progressPercent: null,
    computedHealth: 'GREEN',
    isLate: false,
    targetEndDate: null,
    ownerDisplayName: null,
    sponsorDisplayName: null,
    arbitrationStatus: null,
    arbitrationMetierStatus: null,
    arbitrationComiteStatus: null,
    arbitrationCodirStatus: null,
    businessProblem: null,
    stakeholderLines: [],
    tags,
    portfolioCategory: null,
    myRoles: [],
  };
}

describe('groupPortfolioGanttByTag', () => {
  it('affiche toutes les étiquettes d’un projet sans filtre', () => {
    const sections = groupPortfolioGanttByTag([
      row('p1', [
        { id: 't-a', name: 'Alpha', color: '#111' },
        { id: 't-b', name: 'Beta', color: '#222' },
        { id: 't-c', name: 'Gamma', color: '#333' },
      ]),
    ]);

    expect(sections.map((s) => s.label).sort()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('limite les sections aux étiquettes sélectionnées dans le filtre', () => {
    const sections = groupPortfolioGanttByTag(
      [
        row('p1', [
          { id: 't-a', name: 'Alpha', color: '#111' },
          { id: 't-b', name: 'Beta', color: '#222' },
          { id: 't-c', name: 'Gamma', color: '#333' },
        ]),
      ],
      { visibleTagIds: ['t-a', 't-b'] },
    );

    expect(sections.map((s) => s.label).sort()).toEqual(['Alpha', 'Beta']);
    expect(sections.every((s) => s.rows.length === 1)).toBe(true);
  });

  it('n’affiche pas « Sans étiquette » quand un filtre étiquette est actif', () => {
    const sections = groupPortfolioGanttByTag([row('p1', [])], {
      visibleTagIds: ['t-a'],
    });

    expect(sections).toEqual([]);
  });
});
