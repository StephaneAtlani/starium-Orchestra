import { describe, expect, it } from 'vitest';
import {
  computeAttentionPoints,
  computeAverageProgress,
  computeDeckKpis,
  computePresentationDeckKpis,
  computeStatusBreakdown,
  sortDeckProjects,
  totalPresentationSlides,
} from './codir-deck-metrics';
import type { ProjectListItem } from '../../types/project.types';

function makeProject(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 'p1',
    code: 'PRJ-01',
    name: 'Alpha',
    kind: 'PROJECT',
    type: 'TRANSFORMATION',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    criticality: 'MEDIUM',
    progressPercent: 50,
    derivedProgressPercent: null,
    computedHealth: 'GREEN',
    targetEndDate: '2026-12-31',
    ownerUserId: null,
    ownerDisplayName: 'Marc Dupont',
    openTasksCount: 2,
    openRisksCount: 1,
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
    tags: [],
    portfolioCategory: null,
    ...overrides,
  };
}

describe('codir-deck-metrics', () => {
  it('sortDeckProjects trie par santé puis criticité', () => {
    const items = [
      makeProject({ id: 'a', name: 'Zulu', computedHealth: 'GREEN' }),
      makeProject({ id: 'b', name: 'Alpha', computedHealth: 'RED', criticality: 'LOW' }),
      makeProject({ id: 'c', name: 'Beta', computedHealth: 'RED', criticality: 'HIGH' }),
    ];
    const sorted = sortDeckProjects(items);
    expect(sorted.map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('computeStatusBreakdown compte les statuts', () => {
    const breakdown = computeStatusBreakdown([
      makeProject({ status: 'IN_PROGRESS' }),
      makeProject({ id: 'p2', signals: { ...makeProject().signals, isLate: true } }),
      makeProject({ id: 'p3', status: 'PLANNED' }),
      makeProject({ id: 'p4', status: 'COMPLETED' }),
    ]);
    expect(breakdown).toEqual({
      inProgress: 1,
      late: 1,
      planned: 1,
      completed: 1,
    });
  });

  it('computeAverageProgress calcule la moyenne', () => {
    expect(
      computeAverageProgress([
        makeProject({ progressPercent: 40 }),
        makeProject({ id: 'p2', progressPercent: 60 }),
      ]),
    ).toBe(50);
  });

  it('computeDeckKpis expose les KPI portefeuille', () => {
    const kpis = computeDeckKpis([makeProject()], {
      totalProjects: 1,
      activeProjects: 1,
      inProgressProjects: 1,
      completedProjects: 0,
      completedThisQuarter: 0,
      completedPreviousQuarter: 0,
      lateProjects: 0,
      criticalProjects: 2,
      blockedProjects: 0,
      noRiskProjects: 0,
      noOwnerProjects: 0,
      noMilestoneProjects: 0,
      totalTargetBudgetAmount: '100000',
      totalConsumedBudgetAmount: '60000',
      projectsCreatedThisMonth: 3,
      projectsCreatedPreviousMonth: 1,
    });
    expect(kpis.activeProjects).toBe(1);
    expect(kpis.budgetConsumedPercent).toBe(60);
    expect(kpis.criticalRisks).toBe(2);
    expect(kpis.targetBudgetLabel).toBe('100 k€');
  });

  it('computePresentationDeckKpis agrège le périmètre filtré uniquement', () => {
    const kpis = computePresentationDeckKpis([
      makeProject({
        targetBudgetAmount: '200000',
        consumedBudgetAmount: '100000',
        progressPercent: 40,
      }),
      makeProject({
        id: 'p2',
        targetBudgetAmount: '300000',
        consumedBudgetAmount: '150000',
        progressPercent: 60,
        signals: { ...makeProject().signals, isCritical: true },
      }),
    ]);
    expect(kpis.activeProjects).toBe(2);
    expect(kpis.averageProgress).toBe(50);
    expect(kpis.budgetConsumedPercent).toBe(50);
    expect(kpis.targetBudgetLabel).toBe('500 k€');
    expect(kpis.criticalRisks).toBe(1);
    expect(kpis.activeProjectsDeltaLabel).toBeNull();
  });

  it('computeAttentionPoints retourne les projets à risque', () => {
    const points = computeAttentionPoints([
      makeProject({ computedHealth: 'GREEN' }),
      makeProject({
        id: 'p2',
        name: 'Migration Cloud',
        computedHealth: 'RED',
        signals: { ...makeProject().signals, isLate: true },
        targetBudgetAmount: '80000',
        consumedBudgetAmount: '75000',
      }),
    ]);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0].projectName).toBe('Migration Cloud');
  });

  it('totalPresentationSlides inclut couverture et synthèse', () => {
    expect(totalPresentationSlides(4)).toBe(6);
  });
});
