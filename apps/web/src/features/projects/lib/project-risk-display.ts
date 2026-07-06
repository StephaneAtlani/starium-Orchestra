import {
  PROJECT_RISK_CRITICALITY_LABEL,
  RISK_PI_SCALE_LABEL,
  RISK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import type { ProjectRiskApi, ProjectRiskCriticalityLevel } from '../types/project.types';

export function riskPiShortLabel(n: number): string {
  const full = RISK_PI_SCALE_LABEL[String(n)];
  if (!full) return String(n);
  const dash = full.indexOf('—');
  return dash >= 0 ? full.slice(dash + 2).trim() : full;
}

export type RiskPiTone = 'low' | 'med' | 'high';

export function riskPiTone(n: number): RiskPiTone {
  if (n >= 4) return 'high';
  if (n === 3) return 'med';
  return 'low';
}

export function riskPiToneClass(tone: RiskPiTone): string {
  switch (tone) {
    case 'high':
      return 'text-[color:var(--state-danger)] font-bold';
    case 'med':
      return 'text-[color:var(--state-warning)] font-bold';
    default:
      return 'text-[color:var(--state-success)] font-bold';
  }
}

export function riskCriticalityLabel(level: ProjectRiskCriticalityLevel | string): string {
  return PROJECT_RISK_CRITICALITY_LABEL[level as ProjectRiskCriticalityLevel] ?? level;
}

export function riskStatusLabel(status: string): string {
  return RISK_STATUS_LABEL[status] ?? status;
}

export function riskCriticalityDsBadgeClass(level: ProjectRiskCriticalityLevel | string): string {
  switch (level) {
    case 'CRITICAL':
      return 'starium-ds-badge--danger';
    case 'HIGH':
      return 'starium-ds-badge--warn';
    case 'MEDIUM':
      return 'starium-ds-badge--warn';
    default:
      return 'starium-ds-badge--success';
  }
}

export function riskStatusDsBadgeClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'starium-ds-badge--danger';
    case 'MONITORED':
      return 'starium-ds-badge--info';
    case 'MITIGATED':
      return 'starium-ds-badge--success';
    case 'CLOSED':
      return 'starium-ds-badge--neutral';
    default:
      return 'starium-ds-badge--neutral';
  }
}

export function isRiskDueOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export type RiskActionStats = {
  active: number;
  overdue: number;
  unowned: number;
  untreated: number;
  priorityOpen: number;
};

export type RiskAttentionReason = 'overdue' | 'unowned' | 'untreated' | 'priority';

export type RiskQuickFilter = 'all' | RiskAttentionReason;

export function isActiveRisk(risk: ProjectRiskApi): boolean {
  return risk.status !== 'CLOSED';
}

export function isRiskUntreated(risk: ProjectRiskApi): boolean {
  return (
    !risk.mitigationPlan?.trim() &&
    !risk.complementaryTreatmentMeasures?.trim()
  );
}

export function isPriorityOpenRisk(risk: ProjectRiskApi): boolean {
  return (
    isActiveRisk(risk) &&
    risk.status === 'OPEN' &&
    (risk.criticalityLevel === 'CRITICAL' || risk.criticalityLevel === 'HIGH')
  );
}

export function getRiskAttentionReasons(risk: ProjectRiskApi): RiskAttentionReason[] {
  if (!isActiveRisk(risk)) return [];
  const reasons: RiskAttentionReason[] = [];
  if (isRiskDueOverdue(risk.dueDate)) reasons.push('overdue');
  if (!risk.ownerUserId) reasons.push('unowned');
  if (isRiskUntreated(risk)) reasons.push('untreated');
  if (isPriorityOpenRisk(risk)) reasons.push('priority');
  return reasons;
}

export function riskMatchesQuickFilter(risk: ProjectRiskApi, filter: RiskQuickFilter): boolean {
  if (filter === 'all') return true;
  return getRiskAttentionReasons(risk).includes(filter);
}

/** Indicateurs actionnables pour le pilotage projet. */
export function computeRiskActionStats(risks: ProjectRiskApi[]): RiskActionStats {
  let active = 0;
  let overdue = 0;
  let unowned = 0;
  let untreated = 0;
  let priorityOpen = 0;

  for (const risk of risks) {
    if (!isActiveRisk(risk)) continue;
    active += 1;
    if (isRiskDueOverdue(risk.dueDate)) overdue += 1;
    if (!risk.ownerUserId) unowned += 1;
    if (isRiskUntreated(risk)) untreated += 1;
    if (isPriorityOpenRisk(risk)) priorityOpen += 1;
  }

  return { active, overdue, unowned, untreated, priorityOpen };
}

const ATTENTION_REASON_RANK: Record<RiskAttentionReason, number> = {
  overdue: 4,
  priority: 3,
  unowned: 2,
  untreated: 1,
};

export function riskAttentionReasonLabel(reason: RiskAttentionReason): string {
  switch (reason) {
    case 'overdue':
      return 'Échéance dépassée';
    case 'unowned':
      return 'Propriétaire manquant';
    case 'untreated':
      return 'Plan de traitement absent';
    case 'priority':
      return 'Prioritaire ouvert';
  }
}

/** Risques avec au moins un écart de pilotage, triés par urgence. */
export function sortAttentionRisks(risks: ProjectRiskApi[]): ProjectRiskApi[] {
  return risks
    .filter((r) => getRiskAttentionReasons(r).length > 0)
    .slice()
    .sort((a, b) => {
      const aReasons = getRiskAttentionReasons(a);
      const bReasons = getRiskAttentionReasons(b);
      const aRank = Math.max(...aReasons.map((r) => ATTENTION_REASON_RANK[r]));
      const bRank = Math.max(...bReasons.map((r) => ATTENTION_REASON_RANK[r]));
      if (bRank !== aRank) return bRank - aRank;
      const critDiff =
        (CRITICALITY_RANK[b.criticalityLevel] ?? 0) - (CRITICALITY_RANK[a.criticalityLevel] ?? 0);
      if (critDiff !== 0) return critDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
}

export function buildRiskPilotageSummary(stats: RiskActionStats): string {
  if (stats.active === 0) {
    return 'Aucun risque actif sur ce projet.';
  }
  const gaps = stats.overdue + stats.unowned + stats.untreated;
  if (gaps === 0 && stats.priorityOpen === 0) {
    return `${stats.active} risque${stats.active > 1 ? 's' : ''} actif${stats.active > 1 ? 's' : ''} — registre à jour, aucun écart de pilotage détecté.`;
  }
  const parts: string[] = [];
  if (stats.overdue > 0) parts.push(`${stats.overdue} échéance${stats.overdue > 1 ? 's' : ''} dépassée${stats.overdue > 1 ? 's' : ''}`);
  if (stats.unowned > 0) parts.push(`${stats.unowned} sans propriétaire`);
  if (stats.untreated > 0) parts.push(`${stats.untreated} sans plan de traitement`);
  return `${stats.active} risque${stats.active > 1 ? 's' : ''} actif${stats.active > 1 ? 's' : ''} — ${parts.join(', ')}.`;
}

const CRITICALITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function riskOwnerLabel(
  risk: ProjectRiskApi,
  ownerById: Map<string, string>,
): string {
  if (!risk.ownerUserId) return '—';
  return ownerById.get(risk.ownerUserId) ?? 'Utilisateur inconnu';
}

export const RISK_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_RISK_PAGE_SIZE = 10;
