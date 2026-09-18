import type {
  ComplianceFrameworkOverviewApi,
  ComplianceFrameworkOverviewRequirementApi,
  ComplianceUiStatusApi,
} from '../api/compliance.api';

const UNCATEGORIZED_KEY = '__uncategorized__';

export function requirementDomainKey(
  category: string | null | undefined,
): string {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : UNCATEGORIZED_KEY;
}

/** Normalise le JSON Prisma / API en liste de clés de domaine. */
export function normalizeScopeDomainKeys(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const keys = raw
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return keys.length > 0 ? keys : null;
}

type StatusBucket = {
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
};

function emptyBucket(): StatusBucket {
  return {
    requirementCount: 0,
    compliantCount: 0,
    partiallyCompliantCount: 0,
    nonCompliantCount: 0,
    notApplicableCount: 0,
    notAssessedCount: 0,
  };
}

function bump(bucket: StatusBucket, status: ComplianceUiStatusApi): void {
  bucket.requirementCount += 1;
  switch (status) {
    case 'COMPLIANT':
      bucket.compliantCount += 1;
      break;
    case 'PARTIALLY_COMPLIANT':
      bucket.partiallyCompliantCount += 1;
      break;
    case 'NON_COMPLIANT':
      bucket.nonCompliantCount += 1;
      break;
    case 'NOT_APPLICABLE':
      bucket.notApplicableCount += 1;
      break;
    default:
      bucket.notAssessedCount += 1;
  }
}

function derived(bucket: StatusBucket) {
  const applicableCount =
    bucket.requirementCount -
    bucket.notApplicableCount -
    bucket.notAssessedCount;
  const compliancePercent =
    applicableCount > 0
      ? Math.round((bucket.compliantCount / applicableCount) * 100)
      : null;
  return { applicableCount, compliancePercent };
}

/**
 * Restreint l’overview au périmètre campagne (`scopeDomainKeys`).
 * `null` / vide = tout le référentiel.
 */
export function scopeComplianceOverview(
  overview: ComplianceFrameworkOverviewApi,
  scopeDomainKeys: string[] | null,
): ComplianceFrameworkOverviewApi {
  if (!scopeDomainKeys || scopeDomainKeys.length === 0) {
    return overview;
  }

  const allowed = new Set(scopeDomainKeys);
  const requirements = overview.requirements.filter((r) =>
    allowed.has(requirementDomainKey(r.category)),
  );
  const remediation = overview.remediation.filter((r) =>
    allowed.has(requirementDomainKey(r.category)),
  );
  const domains = overview.domains.filter((d) => allowed.has(d.key));

  const global = emptyBucket();
  for (const req of requirements) {
    bump(global, req.status);
  }
  const { applicableCount, compliancePercent } = derived(global);

  return {
    ...overview,
    domains,
    requirements,
    remediation,
    requirementCount: global.requirementCount,
    compliantCount: global.compliantCount,
    partiallyCompliantCount: global.partiallyCompliantCount,
    nonCompliantCount: global.nonCompliantCount,
    notApplicableCount: global.notApplicableCount,
    notAssessedCount: global.notAssessedCount,
    applicableCount,
    compliancePercent,
  };
}

export function isRequirementInCampaignScope(
  req: Pick<ComplianceFrameworkOverviewRequirementApi, 'category'>,
  scopeDomainKeys: string[] | null,
): boolean {
  if (!scopeDomainKeys || scopeDomainKeys.length === 0) return true;
  return scopeDomainKeys.includes(requirementDomainKey(req.category));
}
