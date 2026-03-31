import {
  buildSanitizedDependsOnMap,
  sanitizeDependsOnTaskId,
} from './project-gantt-dependencies.util';

describe('project-gantt-dependencies.util', () => {
  it('nullifies orphan predecessor', () => {
    const byId = new Map([
      ['a', { dependsOnTaskId: 'ghost' as string | null }],
    ]);
    const ids = new Set(['a']);
    expect(sanitizeDependsOnTaskId('a', 'ghost', byId, ids)).toBeNull();
  });

  it('keeps valid predecessor', () => {
    const byId = new Map([
      ['a', { dependsOnTaskId: 'b' }],
      ['b', { dependsOnTaskId: null }],
    ]);
    const ids = new Set(['a', 'b']);
    expect(sanitizeDependsOnTaskId('a', 'b', byId, ids)).toBe('b');
  });

  it('nullifies direct cycle A -> B -> A', () => {
    const byId = new Map([
      ['a', { dependsOnTaskId: 'b' }],
      ['b', { dependsOnTaskId: 'a' }],
    ]);
    const ids = new Set(['a', 'b']);
    expect(sanitizeDependsOnTaskId('a', 'b', byId, ids)).toBeNull();
    expect(sanitizeDependsOnTaskId('b', 'a', byId, ids)).toBeNull();
  });

  it('nullifies longer cycle when chain returns to task', () => {
    const byId = new Map([
      ['a', { dependsOnTaskId: 'b' }],
      ['b', { dependsOnTaskId: 'c' }],
      ['c', { dependsOnTaskId: 'a' }],
    ]);
    const ids = new Set(['a', 'b', 'c']);
    expect(sanitizeDependsOnTaskId('a', 'b', byId, ids)).toBeNull();
  });

  it('buildSanitizedDependsOnMap applies per task', () => {
    const tasks = [
      { id: 'a', dependsOnTaskId: 'b' as string | null },
      { id: 'b', dependsOnTaskId: 'a' as string | null },
    ];
    const m = buildSanitizedDependsOnMap(tasks);
    expect(m.get('a')).toBeNull();
    expect(m.get('b')).toBeNull();
  });
});
