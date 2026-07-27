import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

const BASE = '/api/compliance';

export type ComplianceDashboardApi = {
  totalRequirementsActiveFrameworks: number;
  compliancePercent: number | null;
  evaluatedCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notAssessedRequirementCount: number;
  notApplicableCount: number;
  requirementsWithoutEvidence: number;
  criticalRisksLinked: number;
};

export async function getComplianceDashboard(
  authFetch: AuthFetch,
): Promise<ComplianceDashboardApi> {
  const res = await authFetch(`${BASE}/dashboard`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceDashboardApi>;
}

export async function listComplianceFrameworks(authFetch: AuthFetch) {
  const res = await authFetch(`${BASE}/frameworks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<
    Array<{
      id: string;
      name: string;
      version: string;
      isActive: boolean;
      nextAuditAt: string | null;
    }>
  >;
}

/** Avancement par référentiel — cartes « Référentiels réglementaires ». */
export type ComplianceFrameworkSummaryApi = {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  nextAuditAt: string | null;
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  evaluatedCount: number;
  /** Conformes / évaluées, en % ; `null` si aucune évaluation. */
  compliancePercent: number | null;
};

export async function listComplianceFrameworkSummaries(
  authFetch: AuthFetch,
): Promise<ComplianceFrameworkSummaryApi[]> {
  const res = await authFetch(`${BASE}/frameworks/summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceFrameworkSummaryApi[]>;
}

export type ComplianceAssessmentStatusApi =
  | 'COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'NON_COMPLIANT'
  | 'NOT_APPLICABLE';

/** Ligne de `GET /compliance/status` — statut + exigence + référentiel résolus. */
export type ComplianceStatusRowApi = {
  id: string;
  requirementId: string;
  status: ComplianceAssessmentStatusApi;
  lastAssessmentDate: string | null;
  comment: string | null;
  updatedAt: string;
  requirement: {
    id: string;
    code: string;
    title: string;
    category: string | null;
    framework: { id: string; name: string; version: string };
  };
};

export async function listComplianceStatuses(
  authFetch: AuthFetch,
  params?: { frameworkId?: string; status?: ComplianceAssessmentStatusApi },
): Promise<ComplianceStatusRowApi[]> {
  const search = new URLSearchParams();
  if (params?.frameworkId) search.set('frameworkId', params.frameworkId);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const res = await authFetch(`${BASE}/status${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceStatusRowApi[]>;
}
