import type { ComplianceEvidenceKindApi } from '../api/compliance.api';

export function complianceEvidenceKindLabel(
  kind: ComplianceEvidenceKindApi | string | undefined,
): string {
  switch (kind) {
    case 'URL':
      return 'Lien externe';
    case 'FILE':
      return 'Fichier';
    case 'OBSERVATION':
      return 'Note / constat';
    default:
      return 'Preuve';
  }
}

export function formatComplianceEvidenceMeta(opts: {
  kind?: ComplianceEvidenceKindApi | string;
  version?: number | null;
  collectedAt?: string | null;
  createdAt?: string | null;
}): string {
  const parts: string[] = [complianceEvidenceKindLabel(opts.kind)];
  const dateIso = opts.collectedAt || opts.createdAt;
  if (dateIso) {
    const d = new Date(dateIso);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      );
    }
  }
  if (opts.version != null && opts.version > 0) {
    parts.push(`v${opts.version}`);
  }
  return parts.join(' · ');
}
