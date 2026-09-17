import {
  listAvailableRequirementLocales,
  normalizeComplianceLocale,
  resolveRequirementDisplayTexts,
} from './compliance-requirement-locale';

describe('compliance-requirement-locale', () => {
  it('normalize défaut fr', () => {
    expect(normalizeComplianceLocale(null)).toBe('fr');
    expect(normalizeComplianceLocale(' EN ')).toBe('en');
  });

  it('résout FR prioritaire', () => {
    const out = resolveRequirementDisplayTexts({
      title: 'EN title',
      description: 'EN desc',
      translations: {
        en: { title: 'incident handling;', description: 'incident handling;' },
        fr: {
          title: 'la gestion des incidents;',
          description: 'la gestion des incidents;',
        },
      },
      locale: 'fr',
    });
    expect(out.title).toBe('la gestion des incidents;');
    expect(out.description).toBe('la gestion des incidents;');
  });

  it('fallback FR si locale absente', () => {
    const out = resolveRequirementDisplayTexts({
      title: 'fallback',
      description: null,
      translations: {
        fr: { title: 'Titre FR', description: 'Desc FR' },
      },
      locale: 'de',
    });
    expect(out.title).toBe('Titre FR');
  });

  it('liste locales avec fr en tête', () => {
    expect(
      listAvailableRequirementLocales({
        en: { title: 'a' },
        fr: { title: 'b' },
        de: { title: 'c' },
      }),
    ).toEqual(['fr', 'de', 'en']);
  });
});
