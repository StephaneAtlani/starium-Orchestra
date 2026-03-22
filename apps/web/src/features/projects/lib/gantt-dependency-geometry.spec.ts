import { describe, expect, it } from 'vitest';
import {
  anchorsForDependencyType,
  buildDependencyPaths,
  orthogonalLinkPath,
  rowCenterY,
  type GanttTaskRowGeom,
} from './gantt-dependency-geometry';

describe('gantt-dependency-geometry', () => {
  it('anchorsForDependencyType : défaut FS', () => {
    expect(anchorsForDependencyType(null)).toEqual({ from: 'end', to: 'start' });
    expect(anchorsForDependencyType('FINISH_TO_START')).toEqual({
      from: 'end',
      to: 'start',
    });
  });

  it('anchorsForDependencyType : SS / FF / SF', () => {
    expect(anchorsForDependencyType('START_TO_START')).toEqual({
      from: 'start',
      to: 'start',
    });
    expect(anchorsForDependencyType('FINISH_TO_FINISH')).toEqual({
      from: 'end',
      to: 'end',
    });
    expect(anchorsForDependencyType('START_TO_FINISH')).toEqual({
      from: 'start',
      to: 'end',
    });
  });

  it('orthogonalLinkPath produit un path non vide', () => {
    const d = orthogonalLinkPath(10, 20, 100, 40);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('L');
  });

  it('rowCenterY', () => {
    expect(rowCenterY(0, 36)).toBe(18);
    expect(rowCenterY(1, 36)).toBe(54);
  });

  it('buildDependencyPaths : FS entre deux lignes', () => {
    const rows: GanttTaskRowGeom[] = [
      {
        taskId: 'a',
        rowIndex: 0,
        leftPx: 0,
        barW: 40,
        startMs: 0,
        endMs: 1,
        dependsOnTaskId: null,
        dependencyType: null,
      },
      {
        taskId: 'b',
        rowIndex: 1,
        leftPx: 50,
        barW: 30,
        startMs: 0,
        endMs: 1,
        dependsOnTaskId: 'a',
        dependencyType: 'FINISH_TO_START',
      },
    ];
    const paths = buildDependencyPaths(rows, 36);
    expect(paths).toHaveLength(1);
    expect(paths[0]!.fromTaskId).toBe('a');
    expect(paths[0]!.toTaskId).toBe('b');
    expect(paths[0]!.path.length).toBeGreaterThan(10);
  });

  it('buildDependencyPaths : ignore prédécesseur manquant ou auto-référence', () => {
    const rows: GanttTaskRowGeom[] = [
      {
        taskId: 'x',
        rowIndex: 0,
        leftPx: 0,
        barW: 10,
        startMs: 0,
        endMs: 1,
        dependsOnTaskId: 'missing',
        dependencyType: 'FINISH_TO_START',
      },
      {
        taskId: 'y',
        rowIndex: 1,
        leftPx: 0,
        barW: 10,
        startMs: 0,
        endMs: 1,
        dependsOnTaskId: 'y',
        dependencyType: 'FINISH_TO_START',
      },
    ];
    expect(buildDependencyPaths(rows, 36)).toHaveLength(0);
  });
});
