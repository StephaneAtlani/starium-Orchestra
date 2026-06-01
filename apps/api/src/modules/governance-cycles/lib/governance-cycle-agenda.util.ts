import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
} from '@prisma/client';
import { isItemUndecidedForInstanceClose } from './governance-cycle-item-status.util';

export const AGENDA_SELECTABLE_SOURCE_TYPES: GovernanceCycleItemSourceType[] = [
  GovernanceCycleItemSourceType.PROJECT,
  GovernanceCycleItemSourceType.BUDGET,
];

export function isAgendaSelectableSourceType(
  sourceType: GovernanceCycleItemSourceType,
): boolean {
  return AGENDA_SELECTABLE_SOURCE_TYPES.includes(sourceType);
}

/** Élément éligible à l’ordre du jour : projet ou budget encore « candidat ». */
export function isAgendaSelectableItem(item: {
  sourceType: GovernanceCycleItemSourceType;
  decisionStatus: GovernanceCycleItemDecisionStatus;
}): boolean {
  return (
    isAgendaSelectableSourceType(item.sourceType) &&
    isItemUndecidedForInstanceClose(item.decisionStatus)
  );
}
