/** Clés présentes dans le DTO mais non persistées sur l’entité (méta-audit). */
export const STATUS_CHANGE_COMMENT_KEY = 'statusChangeComment';

export function entityKeysFromDto(dto: Record<string, unknown>): string[] {
  return Object.keys(dto).filter(
    (k) => dto[k] !== undefined && k !== STATUS_CHANGE_COMMENT_KEY,
  );
}

/** Commentaire optionnel attaché aux audits `*.status.changed` (RFC-032). */
export function normalizeStatusChangeComment(
  raw: string | undefined | null,
): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

export function newValueWithStatusComment(
  to: unknown,
  comment: string | undefined,
): Record<string, unknown> {
  const nv: Record<string, unknown> = { to };
  if (comment) nv.comment = comment;
  return nv;
}
