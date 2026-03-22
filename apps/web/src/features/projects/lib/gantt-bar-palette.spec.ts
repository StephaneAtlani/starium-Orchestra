import { describe, expect, it } from 'vitest';
import {
  buildTaskRootIdMap,
  getGanttBarLegendItems,
  resolveGanttBarTone,
  GANTT_BAR_TONE_DEFAULT,
} from './gantt-bar-palette';

describe('gantt-bar-palette', () => {
  it('resolveGanttBarTone default = ton primaire', () => {
    const t = resolveGanttBarTone(
      'default',
      { id: '1', priority: 'HIGH', status: 'TODO' },
      { rootId: '1', rootIndex: 0 },
    );
    expect(t.track).toBe(GANTT_BAR_TONE_DEFAULT.track);
  });

  it('resolveGanttBarTone priority HIGH ≠ default', () => {
    const t = resolveGanttBarTone(
      'priority',
      { id: '1', priority: 'HIGH', status: 'TODO' },
      { rootId: '1', rootIndex: 0 },
    );
    expect(t.track).not.toBe(GANTT_BAR_TONE_DEFAULT.track);
  });

  it('buildTaskRootIdMap remonte à la racine', () => {
    const m = buildTaskRootIdMap([
      { id: 'a', parentTaskId: null },
      { id: 'b', parentTaskId: 'a' },
      { id: 'c', parentTaskId: 'b' },
    ]);
    expect(m.get('a')).toBe('a');
    expect(m.get('b')).toBe('a');
    expect(m.get('c')).toBe('a');
  });

  it('getGanttBarLegendItems couvre priorité et groupe', () => {
    expect(getGanttBarLegendItems('priority')).toHaveLength(4);
    expect(getGanttBarLegendItems('status')).toHaveLength(6);
    expect(getGanttBarLegendItems('group')).toHaveLength(8);
    expect(getGanttBarLegendItems('default')).toHaveLength(1);
  });
});
