import { describe, expect, it } from 'vitest';
import { assessHeadingAndTooltip } from './compliance-assess-ui';

describe('assessHeadingAndTooltip', () => {
  it('titre court + description → h2 + description dans le (i)', () => {
    expect(
      assessHeadingAndTooltip(
        'Politiques de sécurité de l’information',
        'Définies, approuvées, publiées',
        'A.5.1',
      ),
    ).toEqual({
      heading: 'Politiques de sécurité de l’information',
      tooltipTitle: null,
      tooltipDescription: 'Définies, approuvées, publiées',
    });
  });

  it('pavé long sans description → h2 = code, pavé dans le (i)', () => {
    const long =
      'Taking into account the state-of-the-art and, where applicable, relevant European and international standards, as well as the cost of implementation, the measures referred to in the first subparagraph shall ensure a level of security of network and information systems appropriate to the risks posed.';
    expect(assessHeadingAndTooltip(long, null, 'Art. 21')).toEqual({
      heading: 'Art. 21',
      tooltipTitle: null,
      tooltipDescription: long,
    });
  });

  it('title≡description long → code en h2, texte dans le (i)', () => {
    const long = 'A'.repeat(120);
    expect(assessHeadingAndTooltip(long, long, 'X.1')).toEqual({
      heading: 'X.1',
      tooltipTitle: null,
      tooltipDescription: long,
    });
  });

  it('titre court sans description → h2 seul, pas de (i)', () => {
    expect(
      assessHeadingAndTooltip('Politique de sécurité', null, 'A.5.1'),
    ).toEqual({
      heading: 'Politique de sécurité',
      tooltipTitle: null,
      tooltipDescription: null,
    });
  });
});
