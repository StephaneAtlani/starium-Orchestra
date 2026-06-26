import { describe, expect, it } from 'vitest';
import {
  buildMacroPlanningPhaseRows,
  computeMacroPlanningBounds,
  computeMacroPlanningWindowBounds,
  formatDaysUntilFr,
  getMacroPlanningFirstContentMs,
  getMacroPlanningMaxPanStep,
  getMacroPlanningTodayPercent,
} from './build-macro-planning-gantt';
import { rangeToTimelinePercent } from './gantt-timeline-layout';
import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';

function task(partial: Partial<ProjectTaskApi> & Pick<ProjectTaskApi, 'id' | 'name'>): ProjectTaskApi {
  return {
    code: null,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    progress: 0,
    plannedStartDate: null,
    plannedEndDate: null,
    actualStartDate: null,
    actualEndDate: null,
    sortOrder: 0,
    phaseId: null,
    dependsOnTaskId: null,
    dependencyType: null,
    ownerUserId: null,
    budgetLineId: null,
    ...partial,
  };
}

function milestone(
  partial: Partial<ProjectMilestoneApi> & Pick<ProjectMilestoneApi, 'id' | 'name' | 'targetDate'>,
): ProjectMilestoneApi {
  return {
    code: null,
    description: null,
    achievedDate: null,
    status: 'PLANNED',
    linkedTaskId: null,
    phaseId: null,
    ownerUserId: null,
    sortOrder: 0,
    ...partial,
  };
}

describe('buildMacroPlanningPhaseRows', () => {
  it('calcule les barres de phase à partir des tâches datées', () => {
    const rows = buildMacroPlanningPhaseRows(
      [{ id: 'p1', name: 'Cadrage', sortOrder: 1 }],
      [
        task({
          id: 't1',
          name: 'Analyse',
          phaseId: 'p1',
          plannedStartDate: '2026-05-01T12:00:00.000Z',
          plannedEndDate: '2026-05-15T12:00:00.000Z',
        }),
      ],
      [],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.taskCount).toBe(1);
    expect(rows[0]?.startMs).toBeTruthy();
    expect(rows[0]?.subLabel).toBe('Analyse');
    expect(rows[0]?.subTaskId).toBe('t1');
    expect(rows[0]?.subMilestoneId).toBeNull();
  });
});

describe('computeMacroPlanningBounds', () => {
  it('retourne une plage quand au moins un jalon existe', () => {
    const phaseRows = buildMacroPlanningPhaseRows([], [], [
      milestone({
        id: 'm1',
        name: 'Go/No Go',
        targetDate: '2026-05-23T12:00:00.000Z',
      }),
    ]);
    const bounds = computeMacroPlanningBounds(phaseRows, [
      {
        id: 'm1',
        name: 'Go/No Go',
        targetMs: new Date('2026-05-23T12:00:00.000Z').getTime(),
        phaseId: null,
        status: 'PLANNED',
        color: 'var(--brand-ink)',
      },
    ]);
    expect(bounds).not.toBeNull();
  });
});

describe('computeMacroPlanningWindowBounds', () => {
  const longProjectRows = buildMacroPlanningPhaseRows(
    [{ id: 'p1', name: 'Migration', sortOrder: 1 }],
    [
      task({
        id: 't1',
        name: 'Cut-over',
        phaseId: 'p1',
        plannedStartDate: '2026-03-01T12:00:00.000Z',
        plannedEndDate: '2026-09-01T12:00:00.000Z',
      }),
    ],
    [],
  );

  it('garde une fenêtre fixe (~12 semaines) sans étendre à tout le projet', () => {
    const rows = buildMacroPlanningPhaseRows(
      [
        { id: 'p1', name: 'Cadrage', sortOrder: 1 },
        { id: 'p2', name: 'Déploiement', sortOrder: 2 },
      ],
      [
        task({
          id: 't1',
          name: 'Analyse',
          phaseId: 'p1',
          plannedStartDate: '2026-05-01T12:00:00.000Z',
          plannedEndDate: '2026-05-15T12:00:00.000Z',
        }),
        task({
          id: 't2',
          name: 'Migration',
          phaseId: 'p2',
          plannedStartDate: '2026-08-01T12:00:00.000Z',
          plannedEndDate: '2026-08-20T12:00:00.000Z',
        }),
      ],
      [],
    );

    const full = computeMacroPlanningBounds(
      rows,
      [],
      '2025-01-01T12:00:00.000Z',
      '2027-12-31T12:00:00.000Z',
    );
    const viewport = computeMacroPlanningWindowBounds(rows, [], 'week', 0);

    expect(full).not.toBeNull();
    expect(viewport).not.toBeNull();
    const viewportDays = (viewport!.max - viewport!.min) / 86_400_000;
    expect(viewportDays).toBeLessThanOrEqual(12 * 7 + 10);
    expect(viewport!.max - viewport!.min).toBeLessThan(full!.max - full!.min);
    expect(viewport!.min).toBeLessThanOrEqual(
      getMacroPlanningFirstContentMs(rows, [])! + 86_400_000,
    );
  });

  it('avance la fenêtre à chaque pas tant que maxPanStep le permet', () => {
    const maxStep = getMacroPlanningMaxPanStep(longProjectRows, [], 'week');
    expect(maxStep).toBeGreaterThan(3);

    const seenMins = new Set<number>();
    for (let step = 0; step <= maxStep; step++) {
      const bounds = computeMacroPlanningWindowBounds(longProjectRows, [], 'week', step)!;
      seenMins.add(bounds.min);

      const bar = rangeToTimelinePercent(
        longProjectRows[0]!.startMs!,
        longProjectRows[0]!.endMs!,
        bounds,
      );
      expect(bar).not.toBeNull();
      expect(parseFloat(bar!.width)).toBeLessThanOrEqual(100);
    }
    expect(seenMins.size).toBe(maxStep + 1);
  });

  it('le dernier pas ne bouge plus (borne atteinte)', () => {
    const maxStep = getMacroPlanningMaxPanStep(longProjectRows, [], 'week');
    const atMax = computeMacroPlanningWindowBounds(longProjectRows, [], 'week', maxStep)!;
    const beyond = computeMacroPlanningWindowBounds(
      longProjectRows,
      [],
      'week',
      maxStep + 5,
    )!;
    expect(beyond.min).toBe(atMax.min);
    expect(beyond.max).toBe(atMax.max);
  });
});

describe('formatDaysUntilFr', () => {
  it('formate un délai futur', () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    expect(formatDaysUntilFr(future)).toMatch(/dans 10 jours/);
  });
});

describe('getMacroPlanningTodayPercent', () => {
  it('clamp la position hors plage à 0 ou 100', () => {
    const pastBounds = {
      min: new Date('2020-01-01').getTime(),
      max: new Date('2020-12-31').getTime(),
    };
    expect(getMacroPlanningTodayPercent(pastBounds)).toBe(100);

    const futureBounds = {
      min: new Date('2099-01-01').getTime(),
      max: new Date('2099-12-31').getTime(),
    };
    expect(getMacroPlanningTodayPercent(futureBounds)).toBe(0);
  });
});
