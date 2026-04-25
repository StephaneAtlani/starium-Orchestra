const MIN_TOKEN_LEN = 2;

/** NFC + suppression des marques diacritiques (NFD). */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizeForMatch(input: string): string {
  return stripAccents(input.toLowerCase().trim());
}

export function tokenize(normalized: string): string[] {
  return normalized
    .split(/[\s/.,;:!?'"()[\]{}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_TOKEN_LEN);
}

export function normalizeAndTokenize(raw: string): {
  normalized: string;
  tokens: Set<string>;
} {
  const normalized = normalizeForMatch(raw);
  const tokens = new Set(tokenize(normalized));
  return { normalized, tokens };
}
