import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

const BASE = '/api/compliance';

export type ComplianceDashboardApi = {
  totalRequirementsActiveFrameworks: number;
  /** A = N − NA − U (exigences applicables). */
  applicableCount: number;
  /** C / A en % ; null si A = 0. */
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

/** Ligne de `GET /compliance/requirements` — exigence + statut courant (+ preuves). */
export type ComplianceRequirementRowApi = {
  id: string;
  code: string;
  title: string;
  category: string | null;
  framework: {
    id: string;
    name: string;
    version: string;
    isActive: boolean;
  };
  statuses: Array<{ status: ComplianceAssessmentStatusApi }>;
  evidences: Array<{ id: string }>;
};

export async function listComplianceRequirements(
  authFetch: AuthFetch,
  params?: { frameworkId?: string },
): Promise<ComplianceRequirementRowApi[]> {
  const search = new URLSearchParams();
  if (params?.frameworkId) search.set('frameworkId', params.frameworkId);
  const qs = search.toString();
  const res = await authFetch(`${BASE}/requirements${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceRequirementRowApi[]>;
}

export type ComplianceEvidenceKindApi = 'URL' | 'OBSERVATION' | 'FILE';

export type ComplianceRequirementDetailApi = {
  requirement: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    category: string | null;
    framework?: { name: string; version: string };
  };
  status: {
    id?: string;
    status: ComplianceAssessmentStatusApi;
    comment: string | null;
    lastAssessmentDate?: string | null;
  } | null;
  evidences: Array<{
    id: string;
    name: string;
    url: string | null;
    description?: string | null;
    kind?: ComplianceEvidenceKindApi;
  }>;
  linkedRisks: Array<{
    code: string;
    title: string;
    criticalityLevel: string;
  }>;
  linkedRiskCount: number;
};

export async function getComplianceRequirementDetail(
  authFetch: AuthFetch,
  requirementId: string,
): Promise<ComplianceRequirementDetailApi> {
  const res = await authFetch(`${BASE}/requirements/${requirementId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceRequirementDetailApi>;
}

export type UpsertComplianceStatusPayload = {
  status: ComplianceAssessmentStatusApi;
  comment: string;
  lastAssessmentDate?: string | null;
};

export async function upsertComplianceRequirementStatus(
  authFetch: AuthFetch,
  requirementId: string,
  payload: UpsertComplianceStatusPayload,
) {
  const res = await authFetch(`${BASE}/requirements/${requirementId}/status`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{
    id: string;
    status: ComplianceAssessmentStatusApi;
    comment: string | null;
    lastAssessmentDate: string | null;
  }>;
}

export type CreateComplianceEvidencePayload = {
  requirementId: string;
  name: string;
  description?: string;
  url?: string;
  kind?: ComplianceEvidenceKindApi;
};

export async function createComplianceEvidence(
  authFetch: AuthFetch,
  payload: CreateComplianceEvidencePayload,
) {
  const res = await authFetch(`${BASE}/evidence`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{
    id: string;
    name: string;
    kind?: ComplianceEvidenceKindApi;
  }>;
}
