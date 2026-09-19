/** Libellé métier v{major}.{minor} — jamais d'ID technique. */
export function formatProcedureVersionLabel(
  major: number | null | undefined,
  minor: number | null | undefined,
): string | null {
  if (major == null || minor == null) return null;
  if (!Number.isInteger(major) || !Number.isInteger(minor)) return null;
  if (major < 0 || minor < 0) return null;
  return `v${major}.${minor}`;
}

export type ProcedureBumpType = 'MINOR' | 'MAJOR';

/** Aperçu UI du prochain libellé à la publish. */
export function previewNextProcedureVersionLabel(
  currentPublished: { versionMajor: number; versionMinor: number } | null,
  bumpType: ProcedureBumpType,
): string {
  if (!currentPublished) return 'v1.0';
  if (bumpType === 'MAJOR') {
    return `v${currentPublished.versionMajor + 1}.0`;
  }
  return `v${currentPublished.versionMajor}.${currentPublished.versionMinor + 1}`;
}
