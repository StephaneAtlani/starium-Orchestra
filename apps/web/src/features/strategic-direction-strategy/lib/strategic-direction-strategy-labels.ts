import type { StrategicDirectionStrategyStatus } from '../types/strategic-direction-strategy.types';

/** Libellés métier — alignés demandes projet / arbitrage portefeuille / budgets. */
export const STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS: Record<
  StrategicDirectionStrategyStatus,
  string
> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis à validation',
  APPROVED: 'Validée',
  REJECTED: 'Refusée',
  ARCHIVED: 'Archivée',
};

export const STRATEGIC_DIRECTION_STRATEGY_STATUS_FILTER_OPTIONS: Array<{
  value: StrategicDirectionStrategyStatus;
  label: string;
}> = [
  { value: 'DRAFT', label: STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.DRAFT },
  { value: 'SUBMITTED', label: STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.SUBMITTED },
  { value: 'APPROVED', label: STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.APPROVED },
  { value: 'REJECTED', label: STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.REJECTED },
  { value: 'ARCHIVED', label: STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS.ARCHIVED },
];

export function getStrategicDirectionStrategyStatusLabel(
  status: StrategicDirectionStrategyStatus | string,
): string {
  return (
    STRATEGIC_DIRECTION_STRATEGY_STATUS_LABELS[
      status as StrategicDirectionStrategyStatus
    ] ?? status
  );
}

/** Section workflow — même registre que « Workflow de validation » budgets. */
export const STRATEGIC_DIRECTION_STRATEGY_VALIDATION_SECTION_TITLE =
  'Circuit de validation';

export const STRATEGIC_DIRECTION_STRATEGY_SUBMIT_LABEL = 'Soumettre pour validation';

export const STRATEGIC_DIRECTION_STRATEGY_APPROVE_LABEL = 'Valider';

export const STRATEGIC_DIRECTION_STRATEGY_REJECT_LABEL = 'Refuser';
