import { FLAG_KEYS } from '../feature-flags/flag-keys';
import { resolveV2FlagKeyForResourceType } from './resolve-v2-flag-key';

describe('resolveV2FlagKeyForResourceType', () => {
  it('mappe les six resourceTypes V1', () => {
    expect(resolveV2FlagKeyForResourceType('PROJECT')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
    );
    expect(resolveV2FlagKeyForResourceType('BUDGET')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
    );
    expect(resolveV2FlagKeyForResourceType('BUDGET_LINE')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
    );
    expect(resolveV2FlagKeyForResourceType('CONTRACT')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_CONTRACTS,
    );
    expect(resolveV2FlagKeyForResourceType('SUPPLIER')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_PROCUREMENT,
    );
    expect(resolveV2FlagKeyForResourceType('STRATEGIC_OBJECTIVE')).toBe(
      FLAG_KEYS.ACCESS_DECISION_V2_STRATEGIC_VISION,
    );
  });
});
