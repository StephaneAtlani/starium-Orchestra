/**
 * Règle Starium non négociable : « valeur, jamais l'ID ».
 *
 * Aucun identifiant technique (UUID, CUID, ObjectId, entier interne, token
 * opaque) ne doit être rendu visible à l'utilisateur. Ces helpers remplacent
 * les fallbacks défensifs du type `entity.name ?? entity.id`, qui laissent
 * fuiter l'identifiant dès que le libellé est absent.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const LONG_NUMERIC_PATTERN = /^\d{6,}$/;
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{21,}$/;
const ENUM_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export const DEFAULT_UNKNOWN_LABEL = 'Non renseigné';

/**
 * Détecte les formats d'identifiants techniques les plus courants du produit.
 * Volontairement conservateur : un doute sur un libellé métier doit pencher
 * vers « ce n'est pas un ID » pour ne pas masquer une vraie valeur.
 */
export function isTechnicalId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  if (candidate.length === 0) return false;
  if (candidate.includes(' ')) return false;

  if (UUID_PATTERN.test(candidate)) return true;
  if (OBJECT_ID_PATTERN.test(candidate)) return true;
  if (CUID_PATTERN.test(candidate)) return true;
  if (LONG_NUMERIC_PATTERN.test(candidate)) return true;

  // Token opaque type nanoid : long, sans séparateur lisible, mêlant lettres et
  // chiffres. On épargne les codes métier en capitales (BUDGET_VALIDE, RH_2026).
  if (
    OPAQUE_TOKEN_PATTERN.test(candidate) &&
    /[0-9]/.test(candidate) &&
    /[a-zA-Z]/.test(candidate) &&
    !ENUM_CODE_PATTERN.test(candidate)
  ) {
    return true;
  }

  return false;
}

/**
 * Renvoie un libellé sûr : la valeur si c'est un vrai libellé métier, sinon le
 * texte de repli. Ne renvoie jamais un identifiant technique.
 */
export function displayLabel(
  value: unknown,
  fallback: string = DEFAULT_UNKNOWN_LABEL,
): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (isTechnicalId(trimmed)) return fallback;
  return trimmed;
}

/**
 * Premier libellé exploitable d'une liste de candidats (nom, code, titre…),
 * sinon le texte de repli.
 */
export function firstDisplayLabel(
  candidates: readonly unknown[],
  fallback: string = DEFAULT_UNKNOWN_LABEL,
): string {
  for (const candidate of candidates) {
    const resolved = displayLabel(candidate, '');
    if (resolved) return resolved;
  }
  return fallback;
}
