import { describe, expect, it } from 'vitest';
import { assessHeadingAndTooltip } from './compliance-assess-ui';

describe('assessHeadingAndTooltip', () => {
  it('titre court + description distincte → h2 + (i)', () => {
    expect(
      assessHeadingAndTooltip(
        'Politique de sécurité de l’information',
        'Définies, approuvées, publiées',
        'A.5.1',
      ),
    ).toEqual({
      heading: 'Politique de sécurité de l’information',
      tooltipDescription: 'Définies, approuvées, publiées',
    });
  });

  it('title≡description court (NIS2) → h2 = title + (i) = description', () => {
    expect(
      assessHeadingAndTooltip('incident handling;', 'incident handling;', '21.2.b'),
    ).toEqual({
      heading: 'incident handling;',
      tooltipDescription: 'incident handling;',
    });
  });

  it('title≡description long → h2 = code + (i) = description', () => {
    const long = 'A'.repeat(120);
    expect(assessHeadingAndTooltip(long, long, '21.1')).toEqual({
      heading: '21.1',
      tooltipDescription: long,
    });
  });

  it('pavé title sans description → h2 = code + (i) = pavé', () => {
    const long = 'B'.repeat(120);
    expect(assessHeadingAndTooltip(long, null, '21.1')).toEqual({
      heading: '21.1',
      tooltipDescription: long,
    });
  });

  it('titre court sans description → h2 seul, pas de (i)', () => {
    expect(
      assessHeadingAndTooltip('Politique de sécurité', null, 'A.5.1'),
    ).toEqual({
      heading: 'Politique de sécurité',
      tooltipDescription: null,
    });
  });
});
