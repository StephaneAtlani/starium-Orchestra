import { BadRequestException } from '@nestjs/common';
import {
  BudgetEnvelopeStatus,
  BudgetLineStatus,
  BudgetStatus,
} from '@prisma/client';
import type { ResolvedBudgetWorkflowConfig } from '../../clients/budget-workflow-config.merge';

export const MID_YEAR_JUSTIFICATION_MAX = 500;

export function isMidYearValidatedBudget(status: BudgetStatus): boolean {
  return status === BudgetStatus.VALIDATED;
}

export function assertMidYearJustification(
  description: string | null | undefined,
  requireJustification: boolean,
): string {
  const trimmed = description?.trim() ?? '';
  if (!requireJustification) {
    return trimmed;
  }
  if (!trimmed) {
    throw new BadRequestException({
      code: 'mid_year_justification_required',
      message:
        'Une justification (PA / CODIR) est obligatoire pour un ajout structurel en cours d’exercice.',
    });
  }
  if (trimmed.length > MID_YEAR_JUSTIFICATION_MAX) {
    throw new BadRequestException({
      code: 'mid_year_justification_required',
      message: `La justification ne doit pas dépasser ${MID_YEAR_JUSTIFICATION_MAX} caractères.`,
    });
  }
  return trimmed;
}

export function resolveMidYearLineStatus(
  config: ResolvedBudgetWorkflowConfig,
  requested?: BudgetLineStatus,
): BudgetLineStatus {
  void requested;
  return config.midYearDefaultLineStatus;
}

export function resolveMidYearEnvelopeStatus(
  config: ResolvedBudgetWorkflowConfig,
  requested?: BudgetEnvelopeStatus,
): BudgetEnvelopeStatus {
  void requested;
  return config.midYearDefaultEnvelopeStatus;
}
