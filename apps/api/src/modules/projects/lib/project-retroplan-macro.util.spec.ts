import {
  parseIsoDateOnly,
  subtractCalendarDaysFromUtcNoon,
} from './project-retroplan-macro.util';

describe('project-retroplan-macro.util', () => {
  it('parseIsoDateOnly parses YYYY-MM-DD', () => {
    const d = parseIsoDateOnly('2026-06-15');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(15);
  });

  it('parseIsoDateOnly throws on invalid', () => {
    expect(() => parseIsoDateOnly('not-a-date')).toThrow();
  });

  it('subtractCalendarDaysFromUtcNoon subtracts days', () => {
    const anchor = parseIsoDateOnly('2026-12-31');
    const t0 = subtractCalendarDaysFromUtcNoon(anchor, 0);
    expect(t0.getUTCDate()).toBe(31);
    expect(t0.getUTCMonth()).toBe(11);
    const t7 = subtractCalendarDaysFromUtcNoon(anchor, 7);
    expect(t7.getUTCDate()).toBe(24);
  });
});
