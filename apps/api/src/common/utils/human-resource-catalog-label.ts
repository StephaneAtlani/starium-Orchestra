/**
 * Libellé catalogue Humain (aligné front `humanResourceCatalogLabel`) — jamais l’UUID seul.
 */
export function humanResourceCatalogLabelForApi(r: {
  name: string;
  firstName: string | null;
  email: string | null;
}): string {
  const name =
    [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ') || r.name.trim();
  if (r.email?.trim()) return `${name} — ${r.email.trim()}`;
  return name;
}

export type HumanResourceSummaryPayload = {
  resourceId: string;
  displayName: string;
  email: string | null;
};

export function humanResourceSummaryFromRow(
  row: { id: string; name: string; firstName: string | null; email: string | null } | null,
): HumanResourceSummaryPayload | null {
  if (!row) return null;
  return {
    resourceId: row.id,
    displayName: humanResourceCatalogLabelForApi(row),
    email: row.email?.trim() ?? null,
  };
}
