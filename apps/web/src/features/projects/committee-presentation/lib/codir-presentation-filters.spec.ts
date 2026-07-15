import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CODIR_PAGE_SETTINGS,
  buildPresentationSlides,
} from '../hooks/use-codir-page-settings';
import {
  codirPresentationGanttUsesTagGrouping,
  countPresentationGanttSlides,
  filterProjectsForPresentation,
  resolvePresentationGanttSections,
} from './codir-presentation-filters';
import type { PortfolioGanttRow, ProjectListItem } from '../../types/project.types';

function project(
  id: string,
  status: string,
  tagIds: string[] = [],
): ProjectListItem {
  return {
    id,
    code: id,
    name: `Projet ${id}`,
    kind: 'PROJECT',
    type: 'APPLICATION',
    status,
    priority: 'MEDIUM',
    criticality: 'MEDIUM',
    progressPercent: null,
    derivedProgressPercent: null,
    computedHealth: 'GREEN',
    targetEndDate: null,
    ownerUserId: null,
    ownerDisplayName: null,
    openTasksCount: 0,
    openRisksCount: 0,
    delayedMilestonesCount: 0,
    signals: {
      isLate: false,
      isBlocked: false,
      hasNoOwner: false,
      hasNoTasks: false,
      hasNoRisks: false,
      hasNoMilestones: false,
      hasPlanningDrift: false,
      isCritical: false,
    },
    warnings: [],
    tags: tagIds.map((tagId) => ({ id: tagId, name: tagId, color: null })),
    portfolioCategory: null,
  };
}

describe('filterProjectsForPresentation', () => {
  it('filtre par statuts cochés', () => {
    const items = [
      project('a', 'IN_PROGRESS'),
      project('b', 'COMPLETED'),
      project('c', 'ARCHIVED'),
    ];
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      presentationIncludedStatuses: ['IN_PROGRESS', 'COMPLETED'],
    };

    expect(filterProjectsForPresentation(items, settings).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('filtre par étiquettes (au moins une)', () => {
    const items = [
      project('a', 'IN_PROGRESS', ['t1']),
      project('b', 'IN_PROGRESS', ['t2']),
      project('c', 'IN_PROGRESS', []),
    ];
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      presentationIncludedTagIds: ['t1'],
    };

    expect(filterProjectsForPresentation(items, settings).map((p) => p.id)).toEqual(['a']);
  });

  it('retourne vide si aucun statut sélectionné', () => {
    const items = [project('a', 'IN_PROGRESS')];
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      presentationIncludedStatuses: [],
    };

    expect(filterProjectsForPresentation(items, settings)).toEqual([]);
  });
});

describe('codirPresentationGanttUsesTagGrouping', () => {
  it('groupe par étiquette quand filtre actif', () => {
    expect(
      codirPresentationGanttUsesTagGrouping({
        ...DEFAULT_CODIR_PAGE_SETTINGS,
        presentationIncludedTagIds: ['t1'],
      }),
    ).toBe(true);
  });

  it('groupe par catégorie sans filtre étiquette', () => {
    expect(codirPresentationGanttUsesTagGrouping(DEFAULT_CODIR_PAGE_SETTINGS)).toBe(false);
  });
});

function ganttRow(id: string, status: string, tagIds: string[] = []): PortfolioGanttRow {
  return {
    id,
    code: id,
    name: `Projet ${id}`,
    status,
    startDate: '2026-01-01',
    targetEndDate: '2026-06-01',
    progressPercent: 50,
    tags: tagIds.map((tagId) => ({ id: tagId, name: tagId.toUpperCase(), color: '#336699' })),
    portfolioCategory: null,
    isLate: false,
    ownerDisplayName: null,
  } as PortfolioGanttRow;
}

describe('resolvePresentationGanttSections', () => {
  it('retourne une section par étiquette sélectionnée', () => {
    const items = [
      ganttRow('a', 'IN_PROGRESS', ['t1']),
      ganttRow('b', 'IN_PROGRESS', ['t2']),
    ];
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      includeGanttSlide: true,
      presentationIncludedTagIds: ['t1', 't2', 't3'],
    };

    expect(resolvePresentationGanttSections(items, settings)).toEqual([
      { key: 'tag:t1', label: 'T1' },
      { key: 'tag:t2', label: 'T2' },
      { key: 'tag:t3', label: 'Étiquette' },
    ]);
  });

  it('retourne une slide consolidée sans filtre étiquette', () => {
    const items = [ganttRow('a', 'IN_PROGRESS')];
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      includeGanttSlide: true,
    };

    expect(resolvePresentationGanttSections(items, settings)).toEqual([
      { key: 'gantt:all', label: 'Portefeuille' },
    ]);
  });
});

describe('countPresentationGanttSlides', () => {
  it('compte une slide par étiquette filtrée', () => {
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      includeGanttSlide: true,
      presentationIncludedTagIds: ['t1', 't2'],
    };

    expect(countPresentationGanttSlides(settings)).toBe(2);
  });
});

describe('buildPresentationSlides', () => {
  it('insère une slide Gantt par section', () => {
    const settings = {
      ...DEFAULT_CODIR_PAGE_SETTINGS,
      includeCoverSlide: false,
      includePortfolioSlide: false,
      includeGanttSlide: true,
      presentationIncludedTagIds: ['t1', 't2'],
    };

    const slides = buildPresentationSlides(1, settings, [
      { key: 'tag:t1', label: 'Tag 1' },
      { key: 'tag:t2', label: 'Tag 2' },
    ]);

    expect(slides).toEqual([
      { kind: 'gantt', sectionKey: 'tag:t1', sectionLabel: 'Tag 1', sectionIndex: 0, sectionTotal: 2 },
      { kind: 'gantt', sectionKey: 'tag:t2', sectionLabel: 'Tag 2', sectionIndex: 1, sectionTotal: 2 },
      { kind: 'project', projectIndex: 0 },
    ]);
  });
});
