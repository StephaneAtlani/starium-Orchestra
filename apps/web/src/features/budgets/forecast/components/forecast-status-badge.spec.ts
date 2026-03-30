import { describe, expect, it } from 'vitest';
import { forecastStatusToneClass } from './forecast-status-badge';

describe('forecastStatusToneClass', () => {
  it('OK → neutre', () => {
    expect(forecastStatusToneClass('OK')).toContain('muted');
  });

  it('WARNING → ambre', () => {
    expect(forecastStatusToneClass('WARNING')).toContain('amber');
  });

  it('CRITICAL → rouge', () => {
    expect(forecastStatusToneClass('CRITICAL')).toContain('red');
  });
});
