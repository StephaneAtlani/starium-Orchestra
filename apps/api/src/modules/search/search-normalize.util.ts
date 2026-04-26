/**
 * Normalisation pour indexation et recherche (RFC-CORE-SEARCH-001 §6).
 */

const PUNCTUATION_RE = /[\p{P}\p{S}]+/gu;

export function normalizeSearchText(raw: string): string {
  const s = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(PUNCTUATION_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/** Concatène des fragments optionnels puis normalise une seule fois. */
export function normalizeSearchParts(parts: Array<string | null | undefined>): string {
  const joined = parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p) => p.trim())
    .join(' ');
  return normalizeSearchText(joined);
}
