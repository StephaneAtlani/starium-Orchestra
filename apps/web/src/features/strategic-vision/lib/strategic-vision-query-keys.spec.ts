import { describe, expect, it } from 'vitest';
import { strategicVisionKeys } from './strategic-vision-query-keys';

describe('strategicVisionKeys', () => {
  it('scope les cles par clientId', () => {
    const c1 = 'client-a';
    const c2 = 'client-b';
    expect(strategicVisionKeys.all(c1)).toContain(c1);
    expect(strategicVisionKeys.all(c1)).not.toEqual(strategicVisionKeys.all(c2));
    expect(strategicVisionKeys.kpis(c1)).toContain(c1);
    expect(strategicVisionKeys.alerts(c1)).toContain(c1);
    expect(strategicVisionKeys.objectives(c1)).toContain(c1);
    expect(strategicVisionKeys.list(c1)).toContain(c1);
    expect(strategicVisionKeys.detail(c1, 'vision-1')).toContain(c1);
    expect(strategicVisionKeys.axes(c1, 'vision-1')).toContain(c1);
    expect(strategicVisionKeys.links(c1, 'objective-1')).toContain(c1);
  });

  it('compose correctement la cle objectifs sans filtres', () => {
    const key = strategicVisionKeys.objectives('client-a');
    expect(key[0]).toBe('strategic-vision');
    expect(key).toContain('objectives');
    expect(key).toEqual(['strategic-vision', 'client-a', 'axis', 'all', 'objectives']);
  });

  it('garde la compat legacy root -> all', () => {
    expect(strategicVisionKeys.root('client-a')).toEqual(strategicVisionKeys.all('client-a'));
  });

});
