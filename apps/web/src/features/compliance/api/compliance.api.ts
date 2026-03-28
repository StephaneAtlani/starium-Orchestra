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
    }>
  >;
}
