import type {
  ProjectArbitrationLevelStatus,
  ProjectArbitrationStatus,
  ProjectCopilRecommendation,
  ProjectSheet,
  ProjectSheetRiskLevel,
} from '../types/project.types';

const ARB_GLOBAL: ProjectArbitrationStatus[] = ['DRAFT', 'TO_REVIEW', 'VALIDATED', 'REJECTED'];

function arbitrationStatus(v: unknown): ProjectArbitrationStatus | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : '';
  return ARB_GLOBAL.includes(s as ProjectArbitrationStatus) ? (s as ProjectArbitrationStatus) : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : '')).filter(Boolean);
}

const ARB_LEVELS: ProjectArbitrationLevelStatus[] = [
  'BROUILLON',
  'EN_COURS',
  'SOUMIS_VALIDATION',
  'VALIDE',
  'REFUSE',
];

function arbLevel(v: unknown): ProjectArbitrationLevelStatus {
  const s = typeof v === 'string' ? v : '';
  return ARB_LEVELS.includes(s as ProjectArbitrationLevelStatus)
    ? (s as ProjectArbitrationLevelStatus)
    : 'BROUILLON';
}

function arbLevelNullable(v: unknown): ProjectArbitrationLevelStatus | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : '';
  return ARB_LEVELS.includes(s as ProjectArbitrationLevelStatus)
    ? (s as ProjectArbitrationLevelStatus)
    : null;
}

const COPIL: ProjectCopilRecommendation[] = [
  'NOT_SET',
  'POURSUIVRE',
  'NE_PAS_ENGAGER',
  'SOUS_RESERVE',
  'REPORTER',
  'AJUSTER_CADRAGE',
];

function copil(v: unknown): ProjectCopilRecommendation {
  const s = typeof v === 'string' ? v : '';
  return COPIL.includes(s as ProjectCopilRecommendation) ? (s as ProjectCopilRecommendation) : 'NOT_SET';
}

const RISK_LEVELS: ProjectSheetRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

function riskLevel(v: unknown): ProjectSheetRiskLevel | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : '';
  return RISK_LEVELS.includes(s as ProjectSheetRiskLevel) ? (s as ProjectSheetRiskLevel) : null;
}

function parseTows(v: unknown): ProjectSheet['towsActions'] {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    SO: strArr(o.SO),
    ST: strArr(o.ST),
    WO: strArr(o.WO),
    WT: strArr(o.WT),
  };
}

/**
 * Reconstruit un `ProjectSheet` affichable depuis `projectSheetFieldsAuditSnapshot` (RFC-PROJ-012).
 * `base` fournit id / code / kind absents du payload audit.
 */
export function mapAuditPayloadToProjectSheet(
  base: Pick<ProjectSheet, 'id' | 'code' | 'kind'>,
  payload: Record<string, unknown>,
): ProjectSheet {
  return {
    ...base,
    name: str(payload.name) ?? base.code,
    description: str(payload.description),
    cadreLocation: str(payload.cadreLocation),
    cadreQui: str(payload.cadreQui),
    involvedTeams: str(payload.involvedTeams),
    startDate: str(payload.startDate),
    targetEndDate: str(payload.targetEndDate),
    type: str(payload.type) ?? 'TRANSFORMATION',
    status: str(payload.status) ?? 'DRAFT',
    priority: str(payload.priority) ?? 'MEDIUM',
    criticality: str(payload.criticality) ?? 'MEDIUM',
    targetBudgetAmount: null,
    businessValueScore: num(payload.businessValueScore),
    strategicAlignment: num(payload.strategicAlignment),
    urgencyScore: num(payload.urgencyScore),
    estimatedCost: num(payload.estimatedCost),
    estimatedGain: num(payload.estimatedGain),
    roi: num(payload.roi),
    riskLevel: riskLevel(payload.riskLevel),
    riskResponse: str(payload.riskResponse),
    priorityScore: num(payload.priorityScore),
    arbitrationStatus: arbitrationStatus(payload.arbitrationStatus),
    arbitrationMetierStatus: arbLevel(payload.arbitrationMetierStatus),
    arbitrationComiteStatus: arbLevelNullable(payload.arbitrationComiteStatus),
    arbitrationCodirStatus: arbLevelNullable(payload.arbitrationCodirStatus),
    arbitrationMetierRefusalNote: str(payload.arbitrationMetierRefusalNote),
    arbitrationComiteRefusalNote: str(payload.arbitrationComiteRefusalNote),
    arbitrationCodirRefusalNote: str(payload.arbitrationCodirRefusalNote),
    copilRecommendation: copil(payload.copilRecommendation),
    copilRecommendationNote: str(payload.copilRecommendationNote),
    businessProblem: str(payload.businessProblem),
    businessBenefits: str(payload.businessBenefits),
    businessSuccessKpis: strArr(payload.businessSuccessKpis),
    swotStrengths: strArr(payload.swotStrengths),
    swotWeaknesses: strArr(payload.swotWeaknesses),
    swotOpportunities: strArr(payload.swotOpportunities),
    swotThreats: strArr(payload.swotThreats),
    towsActions: parseTows(payload.towsActions),
  };
}
