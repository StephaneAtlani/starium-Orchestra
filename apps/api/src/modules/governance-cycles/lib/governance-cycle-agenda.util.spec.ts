import { GovernanceCycleItemDecisionStatus, GovernanceCycleItemSourceType } from '@prisma/client';
import { isAgendaSelectableItem } from './governance-cycle-agenda.util';

describe('governance-cycle-agenda.util', () => {
  it('autorise projet/budget candidat', () => {
    expect(
      isAgendaSelectableItem({
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
      }),
    ).toBe(true);
    expect(
      isAgendaSelectableItem({
        sourceType: GovernanceCycleItemSourceType.BUDGET,
        decisionStatus: GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
      }),
    ).toBe(true);
    expect(
      isAgendaSelectableItem({
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
      }),
    ).toBe(false);
  });
});
