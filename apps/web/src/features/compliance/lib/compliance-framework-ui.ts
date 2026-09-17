import type {
  ComplianceFrameworkOverviewApi,
  ComplianceUiStatusApi,
} from '../api/compliance.api';

/** Sigle court pour pastille logo (jamais un id technique). */
export function frameworkInitials(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9À-ÿ]/g, '');
  if (compact.length <= 5) return compact.toUpperCase();
  const words = name.split(/[\s/-]+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 5)
      .toUpperCase();
  }
  return compact.slice(0, 5).toUpperCase();
}

export type StatusSliceKey =
  | 'COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'NON_COMPLIANT'
  | 'NOT_ASSESSED'
  | 'NOT_APPLICABLE';

export type StatusSlice = {
  key: StatusSliceKey;
  label: string;
  count: number;
  color: string;
};

/** Tranches pour barre / donut — uniquement counts API. */
export function buildStatusSlices(
  overview: Pick<
    ComplianceFrameworkOverviewApi,
    | 'compliantCount'
    | 'partiallyCompliantCount'
    | 'nonCompliantCount'
    | 'notAssessedCount'
    | 'notApplicableCount'
  >,
): StatusSlice[] {
  return [
    {
      key: 'COMPLIANT',
      label: 'Conforme',
      count: overview.compliantCount,
      color: 'var(--state-success)',
    },
    {
      key: 'PARTIALLY_COMPLIANT',
      label: 'Partiel',
      count: overview.partiallyCompliantCount,
      color: 'var(--brand-gold)',
    },
    {
      key: 'NON_COMPLIANT',
      label: 'Écart',
      count: overview.nonCompliantCount,
      color: 'var(--state-danger)',
    },
    {
      key: 'NOT_ASSESSED',
      label: 'À évaluer',
      count: overview.notAssessedCount,
      color: 'var(--state-info)',
    },
    {
      key: 'NOT_APPLICABLE',
      label: 'Non applicable',
      count: overview.notApplicableCount,
      color: 'var(--neutral-300)',
    },
  ];
}

export function formatAuditMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

export function isRemediationStatus(status: ComplianceUiStatusApi): boolean {
  return status === 'PARTIALLY_COMPLIANT' || status === 'NON_COMPLIANT';
}
