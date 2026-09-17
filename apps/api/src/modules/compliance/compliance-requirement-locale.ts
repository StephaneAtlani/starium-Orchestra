/**
 * Résolution des textes d’exigence selon la locale user (défaut fr).
 */

export type ComplianceTextLocaleBundle = {
  title?: string | null;
  description?: string | null;
};

export type ComplianceRequirementTranslations = Record<
  string,
  ComplianceTextLocaleBundle
>;

export function normalizeComplianceLocale(
  locale: string | null | undefined,
): string {
  const t = locale?.trim().toLowerCase();
  if (!t) return 'fr';
  return t.slice(0, 12);
}

export function parseRequirementTranslations(
  raw: unknown,
): ComplianceRequirementTranslations | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as ComplianceRequirementTranslations;
}

export function resolveRequirementDisplayTexts(input: {
  title: string;
  description: string | null;
  translations: unknown;
  locale: string | null | undefined;
}): { title: string; description: string | null; locale: string } {
  const locale = normalizeComplianceLocale(input.locale);
  const map = parseRequirementTranslations(input.translations);
  if (!map) {
    return {
      title: input.title,
      description: input.description,
      locale,
    };
  }

  const pick = (lang: string): ComplianceTextLocaleBundle | null => {
    const b = map[lang];
    if (!b) return null;
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    const description =
      typeof b.description === 'string' ? b.description.trim() : null;
    if (!title && !description) return null;
    return { title: title || description || null, description };
  };

  const preferred = pick(locale) ?? pick('fr');
  if (!preferred) {
    const first = Object.values(map).find(
      (b) => b && (b.title || b.description),
    );
    if (first) {
      const title =
        (typeof first.title === 'string' && first.title.trim()) ||
        (typeof first.description === 'string' && first.description.trim()) ||
        input.title;
      const description =
        typeof first.description === 'string'
          ? first.description.trim()
          : input.description;
      return { title, description, locale };
    }
    return {
      title: input.title,
      description: input.description,
      locale,
    };
  }

  return {
    title: preferred.title?.trim() || input.title,
    description:
      preferred.description?.trim() ||
      preferred.title?.trim() ||
      input.description,
    locale,
  };
}

/** Locales disponibles pour le sélecteur UI (ordre stable). */
export function listAvailableRequirementLocales(
  translations: unknown,
): string[] {
  const map = parseRequirementTranslations(translations);
  if (!map) return ['fr'];
  const keys = Object.keys(map)
    .map((k) => k.toLowerCase())
    .filter(Boolean)
    .sort((a, b) => {
      if (a === 'fr') return -1;
      if (b === 'fr') return 1;
      return a.localeCompare(b, 'fr');
    });
  return keys.length > 0 ? keys : ['fr'];
}
