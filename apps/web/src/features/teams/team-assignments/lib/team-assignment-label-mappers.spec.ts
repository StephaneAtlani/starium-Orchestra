import { describe, expect, it } from 'vitest';
import {
  activityTaxonomyKindLabel,
  formatAllocationPercent,
  formatDateOnly,
  formatAssignmentPeriod,
} from './team-assignment-label-mappers';

describe('team-assignment-label-mappers', () => {
  it('activityTaxonomyKindLabel returns French labels', () => {
    expect(activityTaxonomyKindLabel('PROJECT')).toBe('Projet');
    expect(activityTaxonomyKindLabel('RUN')).toBe('Run');
  });

  it('formatAllocationPercent', () => {
    expect(formatAllocationPercent(50)).toContain('50');
    expect(formatAllocationPercent(50)).toContain('%');
  });

  it('formatDateOnly handles ISO', () => {
    const s = formatDateOnly('2026-04-01T00:00:00.000Z');
    expect(s).not.toBe('—');
  });

  it('formatAssignmentPeriod', () => {
    const s = formatAssignmentPeriod('2026-01-01T00:00:00.000Z', null);
    expect(s).toContain('→');
  });
});
