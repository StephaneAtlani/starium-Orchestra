import { describe, expect, it } from 'vitest';
import { importPurposeLabel } from './import-purpose-labels';

describe('importPurposeLabel', () => {
  it('returns French labels', () => {
    expect(importPurposeLabel('STRUCTURE')).toBe('Structure budgétaire');
    expect(importPurposeLabel('REALITY')).toBe('Réel comptable');
    expect(importPurposeLabel('MIXED')).toBe('Mixte');
  });

  it('falls back for null/undefined', () => {
    expect(importPurposeLabel(null)).toBe('Mixte');
    expect(importPurposeLabel(undefined)).toBe('Mixte');
  });
});
