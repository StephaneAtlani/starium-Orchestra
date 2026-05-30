import type {
  GovernanceCycleCadence,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  GovernanceCycleStatus,
} from '../types/governance-cycle.types';

const CYCLE_STATUS_LABELS: Record<GovernanceCycleStatus, string> = {
  DRAFT: 'Brouillon',
  PREPARING: 'En préparation',
  TO_ARBITRATE: 'À arbitrer',
  ARBITRATED: 'Arbitré',
  IN_EXECUTION: 'En exécution',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
};

const CYCLE_CADENCE_LABELS: Record<GovernanceCycleCadence, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTERLY: 'Semestriel',
  YEARLY: 'Annuel',
  ONE_SHOT: 'Ponctuel',
  CONTINUOUS: 'Continu',
  CUSTOM: 'Personnalisé',
};

const ITEM_DECISION_LABELS: Record<GovernanceCycleItemDecisionStatus, string> = {
  CANDIDATE: 'Candidat',
  TO_ARBITRATE: 'À arbitrer',
  ACCEPTED: 'Retenu',
  DEFERRED: 'Différé',
  REJECTED: 'Refusé',
  NEEDS_INFORMATION: 'Complément demandé',
  ACCEPTED_WITH_RESERVE: 'Retenu sous réserve',
};

const ITEM_SOURCE_TYPE_LABELS: Record<GovernanceCycleItemSourceType, string> = {
  PROJECT: 'Projet',
  STRATEGIC_OBJECTIVE: 'Objectif stratégique',
  BUDGET: 'Budget',
  BUDGET_LINE: 'Ligne budgétaire',
  RISK: 'Risque',
  MANUAL: 'Élément manuel',
};

export function getGovernanceCycleStatusLabel(status: GovernanceCycleStatus): string {
  return CYCLE_STATUS_LABELS[status];
}

export function getGovernanceCycleCadenceLabel(cadence: GovernanceCycleCadence): string {
  return CYCLE_CADENCE_LABELS[cadence];
}

export function getGovernanceCycleItemDecisionLabel(
  status: GovernanceCycleItemDecisionStatus,
): string {
  return ITEM_DECISION_LABELS[status];
}

export function getGovernanceCycleItemSourceTypeLabel(
  sourceType: GovernanceCycleItemSourceType,
): string {
  return ITEM_SOURCE_TYPE_LABELS[sourceType];
}

export const GOVERNANCE_CYCLE_STATUS_OPTIONS = (
  Object.entries(CYCLE_STATUS_LABELS) as [GovernanceCycleStatus, string][]
).map(([value, label]) => ({ value, label }));

export const GOVERNANCE_CYCLE_CADENCE_OPTIONS = (
  Object.entries(CYCLE_CADENCE_LABELS) as [GovernanceCycleCadence, string][]
).map(([value, label]) => ({ value, label }));

export const GOVERNANCE_CYCLE_ITEM_DECISION_OPTIONS = (
  Object.entries(ITEM_DECISION_LABELS) as [GovernanceCycleItemDecisionStatus, string][]
).map(([value, label]) => ({ value, label }));

export const GOVERNANCE_CYCLE_ITEM_SOURCE_TYPE_OPTIONS_V1 = (
  ['PROJECT', 'BUDGET', 'MANUAL'] as const
).map((value) => ({
  value,
  label: ITEM_SOURCE_TYPE_LABELS[value],
}));
