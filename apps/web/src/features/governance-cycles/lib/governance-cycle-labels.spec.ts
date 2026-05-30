import { describe, expect, it } from 'vitest';
import {
  getGovernanceCycleCadenceLabel,
  getGovernanceCycleItemDecisionLabel,
  getGovernanceCycleItemSourceTypeLabel,
  getGovernanceCycleStatusLabel,
} from './governance-cycle-labels';

describe('governance-cycle-labels', () => {
  it('expose des libelles FR, pas les enums bruts', () => {
    expect(getGovernanceCycleStatusLabel('TO_ARBITRATE')).toBe('À arbitrer');
    expect(getGovernanceCycleStatusLabel('TO_ARBITRATE')).not.toBe('TO_ARBITRATE');
    expect(getGovernanceCycleCadenceLabel('QUARTERLY')).toBe('Trimestriel');
    expect(getGovernanceCycleItemDecisionLabel('ACCEPTED')).toBe('Retenu');
    expect(getGovernanceCycleItemSourceTypeLabel('PROJECT')).toBe('Projet');
  });
});
