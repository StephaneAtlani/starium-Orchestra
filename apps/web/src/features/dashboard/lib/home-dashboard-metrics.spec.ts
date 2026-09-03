import { describe, expect, it } from 'vitest';
import type { ProjectListItem } from '@/features/projects/types/project.types';
import {
  buildHomeBudgetChartPoints,
  budgetChartHasSignal,
  countHealth,
  countMilestonesWithinDays,
  dynamicSparkSeries,
  filterMonthlyRowsByPeriod,
  selectMyProjects,
  selectPriorityProjects,
  selectUpcomingDeadlines,
  sparkFromBudgetPoints,
  sparkFromCriticalRiskDetectedDates,
  sparkFromProjectCreations,
  sparkFromUpcomingMilestonesByWeek,
} from './home-dashboard-metrics';

function project(
  overrides: Partial<ProjectListItem> & Pick<ProjectListItem, 'id' | 'name'>,
): ProjectListItem {
  return {
    id: overrides.id,
    code: overrides.code ?? 'P',
    name: overrides.name,
    kind: 'PROJECT',
    type: 'TRANSFORMATION',
    status: overrides.status ?? 'IN_PROGRESS',
    priority: overrides.priority ?? 'MEDIUM',
    criticality: 'MEDIUM',
    progressPercent: overrides.progressPercent ?? 50,
    derivedProgressPercent: null,
    computedHealth: overrides.computedHealth ?? 'GREEN',
    targetEndDate: overrides.targetEndDate ?? null,
    ownerUserId: null,
    ownerDisplayName: null,
    openTasksCount: 0,
    openRisksCount: 0,
    delayedMilestonesCount: 0,
    signals: {
      isLate: false,
      isCritical: false,
      isBlocked: false,
      hasNoRisks: false,
      hasNoOwner: false,
      hasNoMilestones: false,
      hasNoTasks: false,
      hasPlanningDrift: false,
    },
    warnings: [],
    tags: [],
    portfolioCategory: null,
    pilotageSnapshot: overrides.pilotageSnapshot,
    myRole: overrides.myRole,
    myRoles: overrides.myRoles,
  };
}

describe('home-dashboard-metrics', () => {
  it('selectPriorityProjects ranks HIGH then RED health', () => {
    const items = [
      project({ id: '1', name: 'A', priority: 'LOW', computedHealth: 'GREEN' }),
      project({ id: '2', name: 'B', priority: 'HIGH', computedHealth: 'ORANGE' }),
      project({ id: '3', name: 'C', priority: 'HIGH', computedHealth: 'RED' }),
    ];
    expect(selectPriorityProjects(items, 2).map((p) => p.id)).toEqual([
      '3',
      '2',
    ]);
  });

  it('countHealth ignores completed projects', () => {
    const items = [
      project({ id: '1', name: 'A', computedHealth: 'GREEN' }),
      project({
        id: '2',
        name: 'B',
        status: 'COMPLETED',
        computedHealth: 'RED',
      }),
      project({ id: '3', name: 'C', computedHealth: 'ORANGE' }),
    ];
    expect(countHealth(items)).toEqual({ green: 1, orange: 1, red: 0 });
  });

  it('selectMyProjects keeps only projects with a user role', () => {
    const items = [
      project({ id: '1', name: 'Mine', myRoles: ['Chef de projet'] }),
      project({ id: '2', name: 'Other' }),
      project({ id: '3', name: 'Also mine', myRole: 'Sponsor' }),
    ];
    expect(selectMyProjects(items).map((p) => p.id)).toEqual(['1', '3']);
  });

  it('selectUpcomingDeadlines filters by window', () => {
    const now = new Date('2025-05-19T12:00:00');
    const items = [
      project({
        id: '1',
        name: 'Portail',
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: {
            name: 'Validation maquette',
            targetDate: '2025-05-22',
          },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
      project({
        id: '2',
        name: 'Autre',
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: {
            name: 'Loin',
            targetDate: '2025-12-01',
          },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
      project({
        id: '3',
        name: 'Retard',
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: {
            name: 'Échu',
            targetDate: '2025-05-01',
          },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
    ];
    const out = selectUpcomingDeadlines(items, { withinDays: 30, now });
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('Validation maquette');
    expect(out[0]?.daysLeft).toBe(3);
  });

  it('selectUpcomingDeadlines returns at most 5 next deadlines', () => {
    const now = new Date('2025-05-01T12:00:00');
    const items = Array.from({ length: 8 }, (_, i) =>
      project({
        id: String(i),
        name: `P${i}`,
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: {
            name: `Jalon ${i}`,
            targetDate: `2025-05-${String(i + 2).padStart(2, '0')}`,
          },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
    );
    const out = selectUpcomingDeadlines(items, { withinDays: 45, limit: 5, now });
    expect(out).toHaveLength(5);
    expect(out.map((d) => d.title)).toEqual([
      'Jalon 0',
      'Jalon 1',
      'Jalon 2',
      'Jalon 3',
      'Jalon 4',
    ]);
  });

  it('countMilestonesWithinDays counts this week', () => {
    const now = new Date('2025-05-19T12:00:00');
    const items = [
      project({
        id: '1',
        name: 'A',
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: { name: 'J1', targetDate: '2025-05-21' },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
      project({
        id: '2',
        name: 'B',
        pilotageSnapshot: {
          delayedMilestones: [],
          nextMilestone: { name: 'J2', targetDate: '2025-06-10' },
          openTasks: [],
          openRisks: [],
          ok: [],
          issues: [],
          moreOpenTasks: 0,
          moreOpenRisks: 0,
          moreDelayedMilestones: 0,
        },
      }),
    ];
    expect(countMilestonesWithinDays(items, 30, now)).toEqual({
      total: 2,
      thisWeek: 1,
    });
  });

  it('buildHomeBudgetChartPoints accumulates', () => {
    const points = buildHomeBudgetChartPoints([
      {
        monthKey: '2025-01',
        label: 'J',
        monthLabel: 'Jan',
        planned: 100,
        realized: 40,
        left: 100,
        right: 40,
      },
      {
        monthKey: '2025-02',
        label: 'F',
        monthLabel: 'Fév',
        planned: 100,
        realized: 50,
        left: 100,
        right: 50,
      },
    ]);
    expect(points[1]).toMatchObject({
      realized: 90,
      target: 200,
      label: 'Fév',
    });
  });

  it('dynamicSparkSeries refuses fake short / empty series', () => {
    expect(dynamicSparkSeries([])).toBeNull();
    expect(dynamicSparkSeries([1])).toBeNull();
    expect(dynamicSparkSeries([1, null, 2])).toEqual([1, 2]);
  });

  it('spark helpers never invent points', () => {
    expect(sparkFromBudgetPoints([])).toBeNull();
    expect(sparkFromProjectCreations(undefined, 3)).toBeNull();
    expect(sparkFromCriticalRiskDetectedDates([])).toBeNull();
    expect(sparkFromUpcomingMilestonesByWeek([])).toBeNull();
    expect(
      sparkFromBudgetPoints([
        { label: 'Jan', realized: 10, target: 20, monthKey: '2025-01' },
        { label: 'Fév', realized: 25, target: 40, monthKey: '2025-02' },
      ]),
    ).toEqual([10, 25]);
    expect(sparkFromProjectCreations(2, 5)).toEqual([2, 5]);
  });

  it('filterMonthlyRowsByPeriod scopes dynamically', () => {
    const rows = [
      { monthKey: '2025-03' },
      { monthKey: '2025-04' },
      { monthKey: '2025-05' },
    ];
    const now = new Date('2025-05-19');
    expect(filterMonthlyRowsByPeriod(rows, 'month', now).map((r) => r.monthKey)).toEqual([
      '2025-04',
      '2025-05',
    ]);
    expect(filterMonthlyRowsByPeriod(rows, 'quarter', now)).toHaveLength(3);
    expect(budgetChartHasSignal([])).toBe(false);
  });
});
