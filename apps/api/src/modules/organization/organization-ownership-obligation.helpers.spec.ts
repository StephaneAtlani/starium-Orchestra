import { resolveBudgetLineEffectiveOwnerForObligation } from './organization-ownership-obligation.helpers';

describe('organization-ownership-obligation.helpers', () => {
  it('resolveBudgetLineEffectiveOwnerForObligation prefers line override', () => {
    expect(
      resolveBudgetLineEffectiveOwnerForObligation('line-ou', 'budget-ou'),
    ).toBe('line-ou');
  });

  it('resolveBudgetLineEffectiveOwnerForObligation inherits budget', () => {
    expect(
      resolveBudgetLineEffectiveOwnerForObligation(null, 'budget-ou'),
    ).toBe('budget-ou');
  });

  it('resolveBudgetLineEffectiveOwnerForObligation null when both null', () => {
    expect(resolveBudgetLineEffectiveOwnerForObligation(null, null)).toBeNull();
  });
});
