import { describe, expect, it } from 'vitest';
import { toTeamAssignmentsListParams } from './team-assignment-list-query';

describe('toTeamAssignmentsListParams', () => {
  it('activeOn exclusif : n’envoie pas from/to', () => {
    const q = toTeamAssignmentsListParams({
      dateMode: 'activeOn',
      activeOn: '2026-06-15',
      from: '2026-01-01',
      to: '2026-12-31',
      includeCancelled: false,
      limit: 20,
      offset: 0,
    });
    expect(q.activeOn).toBe('2026-06-15');
    expect(q.from).toBeUndefined();
    expect(q.to).toBeUndefined();
  });

  it('plage : envoie from et to ensemble', () => {
    const q = toTeamAssignmentsListParams({
      dateMode: 'range',
      from: '2026-01-01',
      to: '2026-03-31',
      includeCancelled: false,
      limit: 20,
      offset: 0,
    });
    expect(q.from).toBe('2026-01-01');
    expect(q.to).toBe('2026-03-31');
    expect(q.activeOn).toBeUndefined();
  });

  it('plage incomplète : n’envoie pas from/to', () => {
    const q = toTeamAssignmentsListParams({
      dateMode: 'range',
      from: '2026-01-01',
      includeCancelled: false,
      limit: 20,
      offset: 0,
    });
    expect(q.from).toBeUndefined();
    expect(q.to).toBeUndefined();
  });

  it('mode none : pas de filtre temporel', () => {
    const q = toTeamAssignmentsListParams({
      dateMode: 'none',
      includeCancelled: false,
      limit: 20,
      offset: 0,
    });
    expect(q.activeOn).toBeUndefined();
    expect(q.from).toBeUndefined();
    expect(q.to).toBeUndefined();
  });
});
