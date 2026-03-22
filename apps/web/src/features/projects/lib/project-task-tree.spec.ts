import { describe, expect, it } from 'vitest';
import { buildProjectTaskTreeRows } from './project-task-tree';

describe('buildProjectTaskTreeRows', () => {
  it('remonte les orphelins à la racine', () => {
    const rows = buildProjectTaskTreeRows([
      {
        id: 'a',
        name: 'A',
        parentTaskId: 'missing',
        sortOrder: 0,
        plannedStartDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].depth).toBe(0);
  });

  it('ordonne par sortOrder puis plannedStartDate puis createdAt', () => {
    const rows = buildProjectTaskTreeRows([
      {
        id: 'b',
        name: 'B',
        parentTaskId: null,
        sortOrder: 1,
        plannedStartDate: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'a',
        name: 'A',
        parentTaskId: null,
        sortOrder: 0,
        plannedStartDate: null,
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
