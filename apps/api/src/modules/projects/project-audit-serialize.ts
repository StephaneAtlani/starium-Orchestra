import { Prisma } from '@prisma/client';
import type {
  Project,
  ProjectMilestone,
  ProjectRisk,
  ProjectTask,
} from '@prisma/client';

/**
 * Sérialisation stable et JSON-safe pour les payloads d’audit (RFC-PROJ-009).
 * Date → ISO string | null, Decimal → string, undefined/absent métier → null.
 */
export function toAuditJson(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  return value;
}

export function diffAuditSnapshots(
  oldSnap: Record<string, unknown>,
  newSnap: Record<string, unknown>,
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)]);
  for (const k of keys) {
    const a = JSON.stringify(oldSnap[k]);
    const b = JSON.stringify(newSnap[k]);
    if (a !== b) {
      oldValue[k] = oldSnap[k];
      newValue[k] = newSnap[k];
    }
  }
  return { oldValue, newValue };
}

/**
 * Retire des diffs globaux les clés déjà journalisées par des logs granulaires
 * (évite la duplication tout en gardant un diff utile sur le reste).
 */
export function omitKeysFromDiff(
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  keys: readonly string[],
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const o = { ...oldValue };
  const n = { ...newValue };
  for (const k of keys) {
    delete o[k];
    delete n[k];
  }
  return { oldValue: o, newValue: n };
}

export function projectEntityAuditSnapshot(p: Project): Record<string, unknown> {
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    kind: p.kind,
    type: p.type,
    status: p.status,
    priority: p.priority,
    sponsorUserId: p.sponsorUserId ?? null,
    ownerUserId: p.ownerUserId ?? null,
    startDate: toAuditJson(p.startDate),
    targetEndDate: toAuditJson(p.targetEndDate),
    actualEndDate: toAuditJson(p.actualEndDate),
    criticality: p.criticality,
    progressPercent: p.progressPercent ?? null,
    targetBudgetAmount: toAuditJson(p.targetBudgetAmount) as string | null,
    pilotNotes: p.pilotNotes ?? null,
    businessValueScore: p.businessValueScore ?? null,
    strategicAlignment: p.strategicAlignment ?? null,
    urgencyScore: p.urgencyScore ?? null,
    estimatedCost: toAuditJson(p.estimatedCost) as string | null,
    estimatedGain: toAuditJson(p.estimatedGain) as string | null,
    roi: toAuditJson(p.roi) as string | null,
    riskLevel: p.riskLevel ?? null,
    priorityScore: toAuditJson(p.priorityScore) as string | null,
    arbitrationStatus: p.arbitrationStatus ?? null,
    copilRecommendation: p.copilRecommendation ?? null,
    businessProblem: p.businessProblem ?? null,
    businessBenefits: p.businessBenefits ?? null,
    cadreLocation: p.cadreLocation ?? null,
    cadreQui: p.cadreQui ?? null,
    businessSuccessKpis: toAuditJson(p.businessSuccessKpis),
    swotStrengths: toAuditJson(p.swotStrengths),
    swotWeaknesses: toAuditJson(p.swotWeaknesses),
    swotOpportunities: toAuditJson(p.swotOpportunities),
    swotThreats: toAuditJson(p.swotThreats),
    towsActions: toAuditJson(p.towsActions),
  };
}

/** Snapshot des seuls champs fiche (RFC-PROJ-012) pour diff audit ciblé */
export function projectSheetFieldsAuditSnapshot(p: Project): Record<string, unknown> {
  return {
    name: p.name,
    cadreLocation: p.cadreLocation ?? null,
    cadreQui: p.cadreQui ?? null,
    startDate: toAuditJson(p.startDate),
    targetEndDate: toAuditJson(p.targetEndDate),
    description: p.description ?? null,
    businessValueScore: p.businessValueScore ?? null,
    strategicAlignment: p.strategicAlignment ?? null,
    urgencyScore: p.urgencyScore ?? null,
    estimatedCost: toAuditJson(p.estimatedCost),
    estimatedGain: toAuditJson(p.estimatedGain),
    roi: toAuditJson(p.roi),
    riskLevel: p.riskLevel ?? null,
    priorityScore: toAuditJson(p.priorityScore),
    arbitrationStatus: p.arbitrationStatus ?? null,
    copilRecommendation: p.copilRecommendation ?? null,
    businessProblem: p.businessProblem ?? null,
    businessBenefits: p.businessBenefits ?? null,
    businessSuccessKpis: toAuditJson(p.businessSuccessKpis),
    swotStrengths: toAuditJson(p.swotStrengths),
    swotWeaknesses: toAuditJson(p.swotWeaknesses),
    swotOpportunities: toAuditJson(p.swotOpportunities),
    swotThreats: toAuditJson(p.swotThreats),
    towsActions: toAuditJson(p.towsActions),
  };
}

export function projectTaskEntityAuditSnapshot(
  t: ProjectTask,
): Record<string, unknown> {
  return {
    projectId: t.projectId,
    title: t.title,
    description: t.description ?? null,
    assigneeUserId: t.assigneeUserId ?? null,
    status: t.status,
    priority: t.priority,
    dueDate: toAuditJson(t.dueDate),
    completedAt: toAuditJson(t.completedAt),
    sortOrder: t.sortOrder,
  };
}

export function projectRiskEntityAuditSnapshot(
  r: ProjectRisk,
): Record<string, unknown> {
  return {
    projectId: r.projectId,
    title: r.title,
    description: r.description ?? null,
    probability: r.probability,
    impact: r.impact,
    actionPlan: r.actionPlan ?? null,
    ownerUserId: r.ownerUserId ?? null,
    status: r.status,
    reviewDate: toAuditJson(r.reviewDate),
  };
}

export function projectRiskLevelSnapshot(r: ProjectRisk): Record<string, unknown> {
  return {
    probability: r.probability,
    impact: r.impact,
  };
}

export function projectMilestoneEntityAuditSnapshot(
  m: ProjectMilestone,
): Record<string, unknown> {
  return {
    projectId: m.projectId,
    name: m.name,
    targetDate: toAuditJson(m.targetDate),
    actualDate: toAuditJson(m.actualDate),
    status: m.status,
  };
}
