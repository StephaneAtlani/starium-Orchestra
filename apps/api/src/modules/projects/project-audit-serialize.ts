import { Prisma } from '@prisma/client';
import type {
  Project,
  ProjectActivity,
  ProjectDocument,
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
    ownerFreeLabel: p.ownerFreeLabel ?? null,
    ownerAffiliation: p.ownerAffiliation ?? null,
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
    riskResponse: p.riskResponse ?? null,
    priorityScore: toAuditJson(p.priorityScore) as string | null,
    arbitrationStatus: p.arbitrationStatus ?? null,
    arbitrationMetierStatus: p.arbitrationMetierStatus ?? null,
    arbitrationComiteStatus: p.arbitrationComiteStatus ?? null,
    arbitrationCodirStatus: p.arbitrationCodirStatus ?? null,
    copilRecommendation: p.copilRecommendation ?? null,
    copilRecommendationNote: p.copilRecommendationNote ?? null,
    businessProblem: p.businessProblem ?? null,
    businessBenefits: p.businessBenefits ?? null,
    cadreLocation: p.cadreLocation ?? null,
    cadreQui: p.cadreQui ?? null,
    involvedTeams: p.involvedTeams ?? null,
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
    type: p.type,
    status: p.status,
    priority: p.priority,
    criticality: p.criticality,
    cadreLocation: p.cadreLocation ?? null,
    cadreQui: p.cadreQui ?? null,
    involvedTeams: p.involvedTeams ?? null,
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
    riskResponse: p.riskResponse ?? null,
    priorityScore: toAuditJson(p.priorityScore),
    arbitrationStatus: p.arbitrationStatus ?? null,
    arbitrationMetierStatus: p.arbitrationMetierStatus ?? null,
    arbitrationComiteStatus: p.arbitrationComiteStatus ?? null,
    arbitrationCodirStatus: p.arbitrationCodirStatus ?? null,
    arbitrationMetierRefusalNote: p.arbitrationMetierRefusalNote ?? null,
    arbitrationComiteRefusalNote: p.arbitrationComiteRefusalNote ?? null,
    arbitrationCodirRefusalNote: p.arbitrationCodirRefusalNote ?? null,
    copilRecommendation: p.copilRecommendation ?? null,
    copilRecommendationNote: p.copilRecommendationNote ?? null,
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
    name: t.name,
    code: t.code ?? null,
    description: t.description ?? null,
    phaseId: t.phaseId ?? null,
    dependsOnTaskId: t.dependsOnTaskId ?? null,
    dependencyType: t.dependencyType ?? null,
    ownerUserId: t.ownerUserId ?? null,
    budgetLineId: t.budgetLineId ?? null,
    bucketId: t.bucketId ?? null,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    plannedStartDate: toAuditJson(t.plannedStartDate),
    plannedEndDate: toAuditJson(t.plannedEndDate),
    actualStartDate: toAuditJson(t.actualStartDate),
    actualEndDate: toAuditJson(t.actualEndDate),
    sortOrder: t.sortOrder,
  };
}

export function projectRiskEntityAuditSnapshot(
  r: ProjectRisk,
): Record<string, unknown> {
  return {
    projectId: r.projectId,
    code: r.code,
    title: r.title,
    description: r.description ?? null,
    category: r.category ?? null,
    riskTypeId: r.riskTypeId,
    threatSource: r.threatSource,
    businessImpact: r.businessImpact,
    likelihoodJustification: r.likelihoodJustification ?? null,
    impactCategory: r.impactCategory ?? null,
    probability: r.probability,
    impact: r.impact,
    criticalityScore: r.criticalityScore,
    criticalityLevel: r.criticalityLevel,
    mitigationPlan: r.mitigationPlan ?? null,
    contingencyPlan: r.contingencyPlan ?? null,
    ownerUserId: r.ownerUserId ?? null,
    status: r.status,
    reviewDate: toAuditJson(r.reviewDate),
    dueDate: toAuditJson(r.dueDate),
    detectedAt: toAuditJson(r.detectedAt),
    closedAt: toAuditJson(r.closedAt),
    sortOrder: r.sortOrder,
    complianceRequirementId: r.complianceRequirementId ?? null,
    treatmentStrategy: r.treatmentStrategy,
    residualRiskLevel: r.residualRiskLevel ?? null,
    residualJustification: r.residualJustification ?? null,
  };
}

export function projectRiskLevelSnapshot(r: ProjectRisk): Record<string, unknown> {
  return {
    probability: r.probability,
    impact: r.impact,
    criticalityScore: r.criticalityScore,
    criticalityLevel: r.criticalityLevel,
  };
}

export function projectMilestoneEntityAuditSnapshot(
  m: ProjectMilestone,
): Record<string, unknown> {
  return {
    projectId: m.projectId,
    name: m.name,
    code: m.code ?? null,
    description: m.description ?? null,
    linkedTaskId: m.linkedTaskId ?? null,
    phaseId: m.phaseId ?? null,
    ownerUserId: m.ownerUserId ?? null,
    targetDate: toAuditJson(m.targetDate),
    achievedDate: toAuditJson(m.achievedDate),
    status: m.status,
    sortOrder: m.sortOrder,
  };
}

export function projectActivityEntityAuditSnapshot(
  a: ProjectActivity,
): Record<string, unknown> {
  return {
    projectId: a.projectId,
    sourceTaskId: a.sourceTaskId,
    name: a.name,
    description: a.description ?? null,
    status: a.status,
    frequency: a.frequency,
    customRrule: a.customRrule ?? null,
    nextExecutionDate: toAuditJson(a.nextExecutionDate),
    lastExecutionDate: toAuditJson(a.lastExecutionDate),
    ownerUserId: a.ownerUserId ?? null,
    budgetLineId: a.budgetLineId ?? null,
  };
}

export function projectDocumentEntityAuditSnapshot(
  d: ProjectDocument,
): Record<string, unknown> {
  return {
    projectId: d.projectId,
    name: d.name,
    originalFilename: d.originalFilename ?? null,
    mimeType: d.mimeType ?? null,
    extension: d.extension ?? null,
    sizeBytes: d.sizeBytes ?? null,
    category: d.category,
    status: d.status,
    storageType: d.storageType,
    storageKey: d.storageKey ?? null,
    externalUrl: d.externalUrl ?? null,
    description: d.description ?? null,
    tags: toAuditJson(d.tags),
    uploadedByUserId: d.uploadedByUserId ?? null,
    archivedAt: toAuditJson(d.archivedAt),
    deletedAt: toAuditJson(d.deletedAt),
  };
}
