import { BadRequestException } from '@nestjs/common';
import { BudgetStatus } from '@prisma/client';

const ALLOWED: ReadonlyArray<readonly [BudgetStatus, BudgetStatus]> = [
  [BudgetStatus.DRAFT, BudgetStatus.SUBMITTED],
  [BudgetStatus.DRAFT, BudgetStatus.ARCHIVED],
  [BudgetStatus.SUBMITTED, BudgetStatus.REVISED],
  [BudgetStatus.SUBMITTED, BudgetStatus.VALIDATED],
  [BudgetStatus.SUBMITTED, BudgetStatus.DRAFT],
  [BudgetStatus.REVISED, BudgetStatus.VALIDATED],
  [BudgetStatus.REVISED, BudgetStatus.SUBMITTED],
  [BudgetStatus.REVISED, BudgetStatus.DRAFT],
  [BudgetStatus.VALIDATED, BudgetStatus.LOCKED],
  [BudgetStatus.VALIDATED, BudgetStatus.REVISED],
  [BudgetStatus.VALIDATED, BudgetStatus.SUBMITTED],
  [BudgetStatus.VALIDATED, BudgetStatus.ARCHIVED],
  [BudgetStatus.LOCKED, BudgetStatus.ARCHIVED],
];

const key = (from: BudgetStatus, to: BudgetStatus) => `${from}->${to}`;

const ALLOWED_SET = new Set(ALLOWED.map(([a, b]) => key(a, b)));

export function isBudgetStatusTransitionAllowed(
  from: BudgetStatus,
  to: BudgetStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_SET.has(key(from, to));
}

export function assertBudgetStatusTransition(
  from: BudgetStatus,
  to: BudgetStatus,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_SET.has(key(from, to))) {
    throw new BadRequestException({
      code: 'invalid_status_transition',
      message: `Invalid budget status transition from ${from} to ${to}`,
    });
  }
}
