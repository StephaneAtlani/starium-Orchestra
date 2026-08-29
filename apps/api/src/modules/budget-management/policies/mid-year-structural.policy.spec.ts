import { BudgetLineStatus, BudgetStatus } from '@prisma/client';
import {
  assertMidYearJustification,
  isMidYearValidatedBudget,
  resolveMidYearLineStatus,
} from './mid-year-structural.policy';
import { mergeBudgetWorkflowConfig } from '../../clients/budget-workflow-config.merge';

describe('mid-year-structural.policy', () => {
  it('ne s’applique qu’au budget VALIDATED', () => {
    expect(isMidYearValidatedBudget(BudgetStatus.VALIDATED)).toBe(true);
    expect(isMidYearValidatedBudget(BudgetStatus.DRAFT)).toBe(false);
    expect(isMidYearValidatedBudget(BudgetStatus.SUBMITTED)).toBe(false);
  });

  it('justification obligatoire', () => {
    expect(() => assertMidYearJustification('  ', true)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'mid_year_justification_required' }),
      }),
    );
    expect(assertMidYearJustification('  Besoin CODIR  ', true)).toBe('Besoin CODIR');
  });

  it('ignore un statut ACTIVE demandé', () => {
    const config = mergeBudgetWorkflowConfig(null);
    expect(resolveMidYearLineStatus(config, BudgetLineStatus.ACTIVE)).toBe(
      BudgetLineStatus.PENDING_VALIDATION,
    );
  });
});
