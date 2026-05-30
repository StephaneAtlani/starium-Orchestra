import { buildGovernanceCyclePeriodLabel } from './governance-cycle-period.util';

describe('buildGovernanceCyclePeriodLabel', () => {
  it('retourne — si aucune date', () => {
    expect(buildGovernanceCyclePeriodLabel(null, null)).toBe('—');
    expect(buildGovernanceCyclePeriodLabel(undefined, undefined)).toBe('—');
  });

  it('formate start et end avec séparateur flèche', () => {
    const start = new Date('2026-06-01T12:00:00.000Z');
    const end = new Date('2026-06-30T12:00:00.000Z');
    const label = buildGovernanceCyclePeriodLabel(start, end);
    expect(label).toContain('→');
    expect(label).toMatch(/juin/i);
    expect(label).toMatch(/2026/);
  });

  it('formate une seule date (start seul)', () => {
    const start = new Date('2026-01-15T12:00:00.000Z');
    expect(buildGovernanceCyclePeriodLabel(start, null)).toMatch(/janv/i);
    expect(buildGovernanceCyclePeriodLabel(start, null)).not.toContain('→');
  });

  it('formate une seule date (end seul)', () => {
    const end = new Date('2026-12-20T12:00:00.000Z');
    expect(buildGovernanceCyclePeriodLabel(null, end)).toMatch(/déc/i);
  });

  it('retourne — pour dates invalides', () => {
    expect(buildGovernanceCyclePeriodLabel(new Date('invalid'), null)).toBe('—');
  });
});
