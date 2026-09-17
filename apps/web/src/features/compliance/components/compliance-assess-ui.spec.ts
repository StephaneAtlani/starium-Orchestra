import { describe, expect, it } from 'vitest';
import { assessHeadingAndTooltip } from './compliance-assess-ui';

describe('assessHeadingAndTooltip', () => {
  it('titre court + description distincte → h2 = title + (i) = description', () => {
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

  it('title≡description court (NIS2) → h2 = texte, pas de (i)', () => {
    expect(
      assessHeadingAndTooltip('incident handling;', 'incident handling;', '21.2.b'),
    ).toEqual({
      heading: 'incident handling;',
      tooltipDescription: null,
    });
  });

  it('title≡description long → h2 tronqué + (i) = texte intégral', () => {
    const long = 'A'.repeat(120);
    const result = assessHeadingAndTooltip(long, long, '21.1');
    expect(result.heading).toBe(`${'A'.repeat(96)}…`);
    expect(result.tooltipDescription).toBe(long);
    expect(result.heading).not.toBe('21.1');
  });

  it('pavé title sans description → h2 tronqué + (i) = pavé', () => {
    const long = 'B'.repeat(120);
    const result = assessHeadingAndTooltip(long, null, '21.1');
    expect(result.heading).toBe(`${'B'.repeat(96)}…`);
    expect(result.tooltipDescription).toBe(long);
    expect(result.heading).not.toBe('21.1');
  });

  it('description longue seule (title = description) → h2 tronqué', () => {
    const long =
      'The measures referred to in paragraph 1 shall be based on an all-hazards approach that aims to protect network and information systems and the physical environment of those systems from incidents, and shall include at least the following:';
    const result = assessHeadingAndTooltip(long, long, '21.2');
    expect(result.heading?.endsWith('…')).toBe(true);
    expect(result.heading?.length).toBeLessThanOrEqual(97);
    expect(result.tooltipDescription).toBe(long);
  });

  it('titre court sans description → h2 seul, pas de (i)', () => {
    expect(
      assessHeadingAndTooltip('Politique de sécurité', null, 'A.5.1'),
    ).toEqual({
      heading: 'Politique de sécurité',
      tooltipDescription: null,
    });
  });

  it('aucun texte → fallback code', () => {
    expect(assessHeadingAndTooltip('', null, '21.2')).toEqual({
      heading: '21.2',
      tooltipDescription: null,
    });
  });
});
