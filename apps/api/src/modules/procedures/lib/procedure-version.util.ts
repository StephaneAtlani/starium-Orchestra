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

export type ResolvedProcedureVersion = {
  major: number;
  minor: number;
  bumpType: ProcedureBumpType;
};

/**
 * Calcule le prochain n° à la publish.
 * 1ʳᵉ publish → toujours 1.0 (bumpType MAJOR, commentaire non requis).
 * Ensuite : MINOR (défaut) ou MAJOR (commentaire obligatoire).
 */
export function resolveNextProcedureVersion(
  currentPublished: { versionMajor: number; versionMinor: number } | null,
  bumpType: ProcedureBumpType | undefined,
  changeSummary: string | undefined,
): ResolvedProcedureVersion {
  if (!currentPublished) {
    return { major: 1, minor: 0, bumpType: 'MAJOR' };
  }

  const bump: ProcedureBumpType = bumpType ?? 'MINOR';
  if (bump === 'MAJOR') {
    const summary = changeSummary?.trim();
    if (!summary) {
      throw new Error('MAJOR_SUMMARY_REQUIRED');
    }
    return {
      major: currentPublished.versionMajor + 1,
      minor: 0,
      bumpType: 'MAJOR',
    };
  }

  return {
    major: currentPublished.versionMajor,
    minor: currentPublished.versionMinor + 1,
    bumpType: 'MINOR',
  };
}

/** Aperçu UI du prochain libellé (sans validation commentaire). */
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
