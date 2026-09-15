import { describe, expect, it } from 'vitest';
import { axisDisplayTitle } from '../components/strategic-axis-name-label';

describe('axisDisplayTitle', () => {
  it('retire le token icon en tête', () => {
    expect(axisDisplayTitle('[icon:rocket;color:amber] Transformation produit')).toBe(
      'Transformation produit',
    );
  });

  it('retire le token en milieu de phrase (alertes)', () => {
    expect(
      axisDisplayTitle('Axe groupe non couvert — [icon:rocket;color:amber] Transformation produit'),
    ).toBe('Axe groupe non couvert — Transformation produit');
  });

  it('garde un libellé sans token', () => {
    expect(axisDisplayTitle('Audit Test')).toBe('Audit Test');
  });
});
