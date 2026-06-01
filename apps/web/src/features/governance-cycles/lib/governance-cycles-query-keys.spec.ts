import { describe, expect, it } from 'vitest';
import { governanceCyclesKeys } from './governance-cycles-query-keys';

describe('governanceCyclesKeys', () => {
  it('scope les cles par clientId', () => {
    const c1 = 'client-a';
    const c2 = 'client-b';
    expect(governanceCyclesKeys.all(c1)).toContain(c1);
    expect(governanceCyclesKeys.all(c1)).not.toEqual(governanceCyclesKeys.all(c2));
    expect(governanceCyclesKeys.list(c1, { limit: 20 })).toContain(c1);
    expect(governanceCyclesKeys.detail(c1, 'cycle-1')).toContain(c1);
    expect(governanceCyclesKeys.items(c1, 'cycle-1')).toContain(c1);
    expect(governanceCyclesKeys.summary(c1, 'cycle-1')).toContain(c1);
    expect(governanceCyclesKeys.byProject(c1, 'proj-1')).toEqual([
      'governance-cycles',
      c1,
      'by-project',
      'proj-1',
    ]);
    expect(governanceCyclesKeys.byProject(c1, 'proj-1')).not.toEqual(
      governanceCyclesKeys.byProject(c2, 'proj-1'),
    );
    expect(typeof governanceCyclesKeys.instances).toBe('function');
    expect(governanceCyclesKeys.instances(c1, 'cycle-1')).toEqual([
      'governance-cycles',
      c1,
      'instances',
      'cycle-1',
      { includeArchived: false },
    ]);
    expect(governanceCyclesKeys.instances(c1, 'cycle-1', { includeArchived: true })).toEqual([
      'governance-cycles',
      c1,
      'instances',
      'cycle-1',
      { includeArchived: true },
    ]);
    expect(governanceCyclesKeys.instanceDetail(c1, 'cycle-1', 'inst-1')).toContain('inst-1');
  });
});
