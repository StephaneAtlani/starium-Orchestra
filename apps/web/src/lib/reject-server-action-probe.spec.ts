import { describe, expect, it } from 'vitest';
import { isServerActionProbe } from './reject-server-action-probe';

describe('isServerActionProbe', () => {
  it('ignore GET même avec Next-Action', () => {
    expect(isServerActionProbe('GET', 'x')).toBe(false);
  });

  it('ignore POST sans Next-Action', () => {
    expect(isServerActionProbe('POST', null)).toBe(false);
    expect(isServerActionProbe('POST', '')).toBe(false);
    expect(isServerActionProbe('POST', '   ')).toBe(false);
  });

  it('bloque POST avec Next-Action (sonde x ou id stale)', () => {
    expect(isServerActionProbe('POST', 'x')).toBe(true);
    expect(isServerActionProbe('POST', '  test  ')).toBe(true);
    expect(isServerActionProbe('POST', 'deadbeef'.repeat(8))).toBe(true);
  });
});
