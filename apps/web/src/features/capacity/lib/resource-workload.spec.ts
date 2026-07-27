import { describe, expect, it } from 'vitest';
import type { ResourceProjectLoadRow } from '../types/capacity.types';
import {
  computeResourceWorkloadStats,
  sortByWorkloadDesc,
  visibleProjects,
  workloadBand,
} from './resource-workload';

function row(partial: Partial<ResourceProjectLoadRow> & { label: string }): ResourceProjectLoadRow {
  return {
    resourceId: `res-${partial.label}`,
    roleName: null,
    capacityDays: 20,
    allocatedDays: 0,
    availableDays: 20,
    loadPercent: 0,
    byProject: {},
    otherDays: 0,
    ...partial,
  };
}

describe('workloadBand', () => {
  it('classe les bandes de charge', () => {
    expect(workloadBand(0)).toBe('low');
    expect(workloadBand(69)).toBe('low');
    expect(workloadBand(70)).toBe('warning');
    expect(workloadBand(100)).toBe('warning');
    expect(workloadBand(101)).toBe('overload');
  });

  it('distingue l’absence de capacité d’une charge nulle', () => {
    expect(workloadBand(null)).toBe('none');
    expect(workloadBand(0)).toBe('low');
  });
});

describe('computeResourceWorkloadStats', () => {
  it('totalise capacité et allocation', () => {
    const stats = computeResourceWorkloadStats([
      row({ label: 'A', capacityDays: 20, allocatedDays: 17, availableDays: 3, loadPercent: 85 }),
      row({ label: 'B', capacityDays: 20, allocatedDays: 13, availableDays: 7, loadPercent: 65 }),
    ]);

    expect(stats.resourceCount).toBe(2);
    expect(stats.totalCapacityDays).toBe(40);
    expect(stats.totalAllocatedDays).toBe(30);
    expect(stats.occupancyPercent).toBe(75);
    expect(stats.availableDays).toBe(10);
    expect(stats.overloadedCount).toBe(0);
  });

  it('compte les ressources en surcharge au-delà de 100 %', () => {
    const stats = computeResourceWorkloadStats([
      row({ label: 'A', loadPercent: 110 }),
      row({ label: 'B', loadPercent: 100 }),
      row({ label: 'C', loadPercent: 130 }),
    ]);

    expect(stats.overloadedCount).toBe(2);
  });

  it('ne laisse pas une surcharge créer de capacité fictive', () => {
    const stats = computeResourceWorkloadStats([
      row({ label: 'A', capacityDays: 20, allocatedDays: 24, availableDays: -4, loadPercent: 120 }),
      row({ label: 'B', capacityDays: 20, allocatedDays: 10, availableDays: 10, loadPercent: 50 }),
    ]);

    // 10 et non 6 : le -4 de A n'est pas compensé.
    expect(stats.availableDays).toBe(10);
  });

  it('compte les ressources réellement allouées', () => {
    const stats = computeResourceWorkloadStats([
      row({ label: 'A', allocatedDays: 5 }),
      row({ label: 'B', allocatedDays: 0 }),
    ]);

    expect(stats.allocatedResourceCount).toBe(1);
  });

  it('renvoie un taux null sans capacité', () => {
    const stats = computeResourceWorkloadStats([
      row({ label: 'A', capacityDays: 0, allocatedDays: 0, availableDays: 0, loadPercent: null }),
    ]);

    expect(stats.occupancyPercent).toBeNull();
  });

  it('gère une liste vide', () => {
    const stats = computeResourceWorkloadStats([]);
    expect(stats).toEqual({
      resourceCount: 0,
      allocatedResourceCount: 0,
      totalCapacityDays: 0,
      totalAllocatedDays: 0,
      availableDays: 0,
      occupancyPercent: null,
      overloadedCount: 0,
    });
  });
});

describe('sortByWorkloadDesc', () => {
  it('place les plus chargées en tête et les sans-capacité en fin', () => {
    const result = sortByWorkloadDesc([
      row({ label: 'Moyen', loadPercent: 65 }),
      row({ label: 'Inconnu', loadPercent: null }),
      row({ label: 'Surcharge', loadPercent: 120 }),
    ]);

    expect(result.map((r) => r.label)).toEqual(['Surcharge', 'Moyen', 'Inconnu']);
  });

  it('départage à égalité par nom', () => {
    const result = sortByWorkloadDesc([
      row({ label: 'Bernard', loadPercent: 80 }),
      row({ label: 'Alice', loadPercent: 80 }),
    ]);

    expect(result.map((r) => r.label)).toEqual(['Alice', 'Bernard']);
  });

  it('ne modifie pas le tableau source', () => {
    const rows = [row({ label: 'A', loadPercent: 10 }), row({ label: 'B', loadPercent: 90 })];
    sortByWorkloadDesc(rows);
    expect(rows.map((r) => r.label)).toEqual(['A', 'B']);
  });
});

describe('visibleProjects', () => {
  it('masque les projets sans allocation', () => {
    const result = visibleProjects({
      projects: [
        { id: 'p1', name: 'Portail', code: null },
        { id: 'p2', name: 'Cloud', code: null },
      ],
      items: [row({ label: 'A', byProject: { p1: 5 } })],
    });

    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('masque un projet dont toutes les allocations sont nulles', () => {
    const result = visibleProjects({
      projects: [{ id: 'p1', name: 'Portail', code: null }],
      items: [row({ label: 'A', byProject: { p1: 0 } })],
    });

    expect(result).toEqual([]);
  });
});
