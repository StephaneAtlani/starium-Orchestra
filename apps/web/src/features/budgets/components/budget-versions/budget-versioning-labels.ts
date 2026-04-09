/** Libellés FR pour enums versioning (API). */

export function formatVersionKind(kind: string | null | undefined): string {
  switch (kind) {
    case 'BASELINE':
      return 'Baseline';
    case 'REVISION':
      return 'Révision';
    default:
      return kind ?? '—';
  }
}

export function formatVersionStatus(status: string | null | undefined): string {
  switch (status) {
    case 'DRAFT':
      return 'Brouillon';
    case 'ACTIVE':
      return 'Active';
    case 'SUPERSEDED':
      return 'Remplacée';
    case 'ARCHIVED':
      return 'Archivée';
    default:
      return status ?? '—';
  }
}

export function formatVersionTitle(row: {
  versionLabel: string | null;
  versionNumber: number | null;
}): string {
  if (row.versionLabel?.trim()) return row.versionLabel.trim();
  if (row.versionNumber != null) return `V${row.versionNumber}`;
  return 'Version';
}

/** Variante visuelle shadcn pour le badge de statut de version (fiche budget, listes). */
export function versionStatusBadgeVariant(
  status: string | null | undefined,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'DRAFT':
      return 'secondary';
    case 'ARCHIVED':
      return 'destructive';
    case 'SUPERSEDED':
    default:
      return 'outline';
  }
}
