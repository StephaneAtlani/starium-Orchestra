import type {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemResponseDto,
  GovernanceCycleItemSourceType,
} from '../types/governance-cycle.types';

const AGENDA_SOURCE_TYPES: GovernanceCycleItemSourceType[] = ['PROJECT', 'BUDGET'];

export function normalizeLineDecisionStatus(
  status: GovernanceCycleItemDecisionStatus,
): GovernanceCycleItemDecisionStatus {
  return status === 'TO_ARBITRATE' ? 'CANDIDATE' : status;
}

export function isAgendaCandidateItem(item: GovernanceCycleItemResponseDto): boolean {
  const status = normalizeLineDecisionStatus(item.decisionStatus);
  return AGENDA_SOURCE_TYPES.includes(item.sourceType) && status === 'CANDIDATE';
}

export function groupAgendaCandidateItems(items: GovernanceCycleItemResponseDto[]) {
  const candidates = items.filter(isAgendaCandidateItem);
  return {
    projects: candidates.filter((i) => i.sourceType === 'PROJECT'),
    budgets: candidates.filter((i) => i.sourceType === 'BUDGET'),
  };
}

/** Tous les projets / budgets du cycle (préparation séance — candidats ou non). */
export function groupProjectBudgetCycleItems(items: GovernanceCycleItemResponseDto[]) {
  const projectOrBudget = items.filter((i) => AGENDA_SOURCE_TYPES.includes(i.sourceType));
  return {
    projects: projectOrBudget.filter((i) => i.sourceType === 'PROJECT'),
    budgets: projectOrBudget.filter((i) => i.sourceType === 'BUDGET'),
  };
}

export function filterAgendaSelectionToCandidates(
  selection: string[],
  items: GovernanceCycleItemResponseDto[],
): string[] {
  const eligible = new Set(items.filter(isAgendaCandidateItem).map((i) => i.id));
  return selection.filter((id) => eligible.has(id));
}

/** Aide UX quand aucun point n’est sélectionnable à l’ODJ. */
export function summarizeAgendaEligibility(items: GovernanceCycleItemResponseDto[]) {
  const projectOrBudget = items.filter((i) =>
    AGENDA_SOURCE_TYPES.includes(i.sourceType),
  );
  const candidates = items.filter(isAgendaCandidateItem);
  return {
    totalItems: items.length,
    projectOrBudgetCount: projectOrBudget.length,
    candidateCount: candidates.length,
    otherSourceCount: items.length - projectOrBudget.length,
    decidedProjectOrBudgetCount: projectOrBudget.length - candidates.length,
  };
}
