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

export type ComplianceFrameworkListItemApi = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  provider: string | null;
  isActive: boolean;
  nextAuditAt: string | null;
  requirementCount: number;
  domainCount: number;
  familyLabel: string;
};

export type ComplianceCatalogItemApi = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  provider: string | null;
  requirementCount: number;
  domainCount: number;
  familyLabel: string;
  scope: 'platform';
};

export async function listComplianceFrameworks(authFetch: AuthFetch) {
  const res = await authFetch(`${BASE}/frameworks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceFrameworkListItemApi[]>;
}

export async function listComplianceFrameworkCatalog(authFetch: AuthFetch) {
  const res = await authFetch(`${BASE}/frameworks/catalog`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceCatalogItemApi[]>;
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

export type ComplianceUiStatusApi =
  | ComplianceAssessmentStatusApi
  | 'NOT_ASSESSED';

export type ComplianceFrameworkDomainApi = {
  key: string;
  label: string;
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  applicableCount: number;
  compliancePercent: number | null;
};

export type ComplianceFrameworkOverviewRequirementApi = {
  id: string;
  code: string;
  title: string;
  category: string | null;
  status: ComplianceUiStatusApi;
  evidenceCount: number;
  linkedRiskCount: number;
};

export type ComplianceFrameworkOverviewApi = {
  framework: {
    id: string;
    name: string;
    version: string;
    isActive: boolean;
    nextAuditAt: string | null;
  };
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  applicableCount: number;
  compliancePercent: number | null;
  domains: ComplianceFrameworkDomainApi[];
  requirements: ComplianceFrameworkOverviewRequirementApi[];
  remediation: ComplianceFrameworkOverviewRequirementApi[];
};

export async function getComplianceFrameworkOverview(
  authFetch: AuthFetch,
  frameworkId: string,
): Promise<ComplianceFrameworkOverviewApi> {
  const res = await authFetch(`${BASE}/frameworks/${frameworkId}/overview`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceFrameworkOverviewApi>;
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
  description?: string | null;
  category: string | null;
  contentLocale?: string;
  availableLocales?: string[];
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

export type ComplianceEvidenceAssessmentApi =
  | 'TO_REVIEW'
  | 'RELEVANT'
  | 'PARTIAL'
  | 'INSUFFICIENT';

export type ComplianceNaRequestStatusApi =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ComplianceRequirementDetailApi = {
  requirement: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    category: string | null;
    contentLocale?: string;
    availableLocales?: string[];
    framework?: { name: string; version: string };
  };
  status: {
    id?: string;
    status: ComplianceAssessmentStatusApi;
    comment: string | null;
    lastAssessmentDate?: string | null;
    maturityLevel?: number | null;
    ownerUserId?: string | null;
    ownerLabel?: string | null;
    updatedAt?: string;
  } | null;
  naRequest: {
    id: string;
    status: ComplianceNaRequestStatusApi;
    justification: string;
    reviewNote: string | null;
    requestedAt: string;
    reviewedAt: string | null;
  } | null;
  contributions: Array<{
    id: string;
    assigneeLabel: string;
    instruction: string;
    dueAt: string | null;
    status: string;
    response: string | null;
  }>;
  gaps: Array<{
    id: string;
    title: string;
    finding: string;
    criticality: string;
    status: string;
    ownerLabel: string | null;
    dueAt: string | null;
  }>;
  evidences: Array<{
    id: string;
    name: string;
    url: string | null;
    description?: string | null;
    kind?: ComplianceEvidenceKindApi;
    version?: number;
    assessment?: ComplianceEvidenceAssessmentApi;
    isCurrent?: boolean;
    collectedAt?: string | null;
    createdAt?: string | null;
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
  maturityLevel?: number | null;
  ownerUserId?: string | null;
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

export async function requestComplianceNa(
  authFetch: AuthFetch,
  requirementId: string,
  justification: string,
) {
  const res = await authFetch(
    `${BASE}/requirements/${requirementId}/na-request`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ justification }),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function approveComplianceNa(
  authFetch: AuthFetch,
  requirementId: string,
  reviewNote?: string,
) {
  const res = await authFetch(
    `${BASE}/requirements/${requirementId}/na-approve`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reviewNote }),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function rejectComplianceNa(
  authFetch: AuthFetch,
  requirementId: string,
  reviewNote: string,
) {
  const res = await authFetch(
    `${BASE}/requirements/${requirementId}/na-reject`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reviewNote }),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function cancelComplianceNa(
  authFetch: AuthFetch,
  requirementId: string,
) {
  const res = await authFetch(
    `${BASE}/requirements/${requirementId}/na-cancel`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function createComplianceContribution(
  authFetch: AuthFetch,
  payload: {
    requirementId: string;
    assigneeUserId: string;
    instruction: string;
    dueAt?: string;
  },
) {
  const res = await authFetch(`${BASE}/contributions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function patchComplianceContribution(
  authFetch: AuthFetch,
  contributionId: string,
  payload: {
    status?: string;
    response?: string | null;
    instruction?: string;
    dueAt?: string | null;
    assigneeUserId?: string;
  },
) {
  const res = await authFetch(`${BASE}/contributions/${contributionId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function listMyComplianceContributions(authFetch: AuthFetch) {
  const res = await authFetch(`${BASE}/contributions?mine=1`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<
    Array<{
      id: string;
      requirementId: string;
      requirementCode: string;
      requirementTitle: string;
      frameworkName: string;
      assigneeLabel: string;
      instruction: string;
      dueAt: string | null;
      status: string;
      response: string | null;
    }>
  >;
}

export async function createComplianceGap(
  authFetch: AuthFetch,
  payload: {
    requirementId: string;
    title: string;
    finding: string;
    criticality?: string;
    ownerUserId?: string;
    dueAt?: string;
  },
) {
  const res = await authFetch(`${BASE}/gaps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceGapApi>;
}

export type ComplianceGapStatusApi =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'TO_VERIFY'
  | 'CLOSED'
  | 'CANCELLED';

export type ComplianceGapApi = {
  id: string;
  requirementId: string;
  title: string;
  finding: string;
  criticality: string;
  status: ComplianceGapStatusApi;
  ownerUserId: string | null;
  ownerLabel: string | null;
  dueAt: string | null;
  businessImpact: string | null;
  rootCause: string | null;
  verificationNote: string | null;
  closedAt: string | null;
  cancelReason: string | null;
  projectRiskId: string | null;
  createdAt: string;
  requirementCode?: string;
  requirementTitle?: string;
};

export async function listComplianceGaps(
  authFetch: AuthFetch,
  opts?: { requirementId?: string },
) {
  const qs = new URLSearchParams();
  if (opts?.requirementId) qs.set('requirementId', opts.requirementId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await authFetch(`${BASE}/gaps${suffix}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceGapApi[]>;
}

export async function patchComplianceGap(
  authFetch: AuthFetch,
  gapId: string,
  payload: {
    status?: ComplianceGapStatusApi | string;
    verificationNote?: string;
    cancelReason?: string;
  },
) {
  const res = await authFetch(`${BASE}/gaps/${gapId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceGapApi>;
}

export type ComplianceRemediationPlanModeApi = 'CREATE' | 'LINK';

export type ComplianceRemediationPlanPayload = {
  mode: ComplianceRemediationPlanModeApi;
  actionPlanId?: string;
  title?: string;
  description?: string;
  code?: string;
  startDate?: string;
  targetDate?: string;
  ownerUserId?: string;
  taskTitle?: string;
};

export type ComplianceRemediationPlanResultApi = {
  gap: { id: string; title: string; dueAt: string | null };
  actionPlan: {
    id: string;
    code: string;
    title: string;
    targetDate: string | null;
    startDate: string | null;
  };
  task: { id: string; name: string };
};

export async function attachComplianceRemediationPlanForRequirement(
  authFetch: AuthFetch,
  requirementId: string,
  payload: ComplianceRemediationPlanPayload,
) {
  const res = await authFetch(
    `${BASE}/requirements/${requirementId}/remediation-plan`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceRemediationPlanResultApi>;
}

export async function listComplianceGapActionPlanTasks(
  authFetch: AuthFetch,
  gapId: string,
) {
  const res = await authFetch(`${BASE}/gaps/${gapId}/action-plan-tasks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{
    items: Array<{
      id: string;
      name: string;
      actionPlan: {
        id: string;
        code: string;
        title: string;
        targetDate: string | null;
        startDate: string | null;
      } | null;
    }>;
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

export async function patchComplianceEvidence(
  authFetch: AuthFetch,
  evidenceId: string,
  payload: { assessment?: ComplianceEvidenceAssessmentApi; name?: string },
) {
  const res = await authFetch(`${BASE}/evidence/${evidenceId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function createComplianceEvidenceVersion(
  authFetch: AuthFetch,
  evidenceId: string,
  payload?: {
    name?: string;
    description?: string | null;
    url?: string | null;
  },
) {
  const res = await authFetch(`${BASE}/evidence/${evidenceId}/versions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

/** COMP.V2 — campagnes / revues. */
export type ComplianceCampaignStatusApi =
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED'
  | 'ARCHIVED';

export type ComplianceCampaignModalityApi =
  | 'SELF_ASSESSMENT'
  | 'INTERNAL_AUDIT'
  | 'EXTERNAL_AUDIT';

export type ComplianceCampaignOwnerApi = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  jobTitle: string | null;
};

export type ComplianceCampaignListItemApi = {
  id: string;
  name: string;
  status: ComplianceCampaignStatusApi;
  frozenFrameworkName: string;
  frozenFrameworkVersion: string;
  modality: ComplianceCampaignModalityApi;
  scopeDomainKeys: string[] | null;
  ownerUserId: string | null;
  owner: ComplianceCampaignOwnerApi | null;
  dueAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  _count: { snapshots: number };
  framework: { id: string; name: string; version: string };
};

export type ComplianceCampaignDetailApi = ComplianceCampaignListItemApi & {
  closeNote: string | null;
  reviewFrequencyMonths: number;
  snapshots: Array<{
    id: string;
    label: string | null;
    createdAt: string;
  }>;
};

export async function listComplianceCampaigns(
  authFetch: AuthFetch,
  frameworkId?: string,
): Promise<ComplianceCampaignListItemApi[]> {
  const qs = frameworkId
    ? `?frameworkId=${encodeURIComponent(frameworkId)}`
    : '';
  const res = await authFetch(`${BASE}/campaigns${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceCampaignListItemApi[]>;
}

export async function createComplianceCampaign(
  authFetch: AuthFetch,
  payload: {
    frameworkId: string;
    name?: string;
    openImmediately?: boolean;
    createSnapshot?: boolean;
    reviewFrequencyMonths?: number;
    scopeDomainKeys?: string[];
    modality?: ComplianceCampaignModalityApi;
    ownerUserId?: string;
    dueAt?: string;
  },
): Promise<ComplianceCampaignDetailApi> {
  const res = await authFetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceCampaignDetailApi>;
}

export async function getComplianceCampaign(
  authFetch: AuthFetch,
  campaignId: string,
): Promise<ComplianceCampaignDetailApi> {
  const res = await authFetch(`${BASE}/campaigns/${campaignId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceCampaignDetailApi>;
}

export async function createComplianceCampaignSnapshot(
  authFetch: AuthFetch,
  campaignId: string,
  payload?: { label?: string },
): Promise<{ id: string; label: string | null; createdAt: string }> {
  const res = await authFetch(`${BASE}/campaigns/${campaignId}/snapshots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{
    id: string;
    label: string | null;
    createdAt: string;
  }>;
}

export async function closeComplianceCampaign(
  authFetch: AuthFetch,
  campaignId: string,
  payload?: { closeNote?: string; createSnapshot?: boolean },
): Promise<ComplianceCampaignDetailApi> {
  const res = await authFetch(`${BASE}/campaigns/${campaignId}/close`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComplianceCampaignDetailApi>;
}

export async function getComplianceCampaignEvaluationsTemplate(
  authFetch: AuthFetch,
): Promise<{ filename: string; csv: string }> {
  const res = await authFetch(
    `${BASE}/campaigns/evaluations-import-template`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ filename: string; csv: string }>;
}

export type CampaignEvalImportPreviewApi = {
  campaignId: string;
  fingerprint: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: Array<{
    line: number;
    code: string;
    status: string | null;
    comment: string;
    error: string | null;
    ok: boolean;
  }>;
};

export async function previewCampaignEvaluationsImport(
  authFetch: AuthFetch,
  campaignId: string,
  csvContent: string,
): Promise<CampaignEvalImportPreviewApi> {
  const res = await authFetch(
    `${BASE}/campaigns/${campaignId}/evaluations-import/preview`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csvContent }),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<CampaignEvalImportPreviewApi>;
}

export async function confirmCampaignEvaluationsImport(
  authFetch: AuthFetch,
  campaignId: string,
  payload: { fingerprint: string; csvContent: string },
): Promise<{ imported: number }> {
  const res = await authFetch(
    `${BASE}/campaigns/${campaignId}/evaluations-import/confirm`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ imported: number }>;
}

export async function getComplianceCampaignSnapshot(
  authFetch: AuthFetch,
  campaignId: string,
  snapshotId: string,
): Promise<{
  id: string;
  label: string | null;
  createdAt: string;
  payload: {
    totals?: {
      requirementCount?: number;
      compliancePercent?: number | null;
      compliantCount?: number;
      partiallyCompliantCount?: number;
      nonCompliantCount?: number;
      notAssessedCount?: number;
    };
    campaign?: { name?: string; frozenFrameworkName?: string };
  };
}> {
  const res = await authFetch(
    `${BASE}/campaigns/${campaignId}/snapshots/${snapshotId}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function downloadComplianceCampaignSnapshotZip(
  authFetch: AuthFetch,
  campaignId: string,
  snapshotId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(
    `${BASE}/campaigns/${campaignId}/snapshots/${snapshotId}/export.zip`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  const cd = res.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(cd);
  const filename = match?.[1] ?? 'conformite-audit.zip';
  const blob = await res.blob();
  return { blob, filename };
}
