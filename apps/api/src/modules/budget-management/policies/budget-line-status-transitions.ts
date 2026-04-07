import { BadRequestException } from '@nestjs/common';
import { BudgetLineStatus } from '@prisma/client';

const ALLOWED: ReadonlyArray<readonly [BudgetLineStatus, BudgetLineStatus]> = [
  [BudgetLineStatus.DRAFT, BudgetLineStatus.PENDING_VALIDATION],
  [BudgetLineStatus.DRAFT, BudgetLineStatus.ARCHIVED],
  [BudgetLineStatus.PENDING_VALIDATION, BudgetLineStatus.ACTIVE],
  [BudgetLineStatus.PENDING_VALIDATION, BudgetLineStatus.REJECTED],
  [BudgetLineStatus.PENDING_VALIDATION, BudgetLineStatus.DEFERRED],
  [BudgetLineStatus.REJECTED, BudgetLineStatus.DRAFT],
  [BudgetLineStatus.DEFERRED, BudgetLineStatus.DRAFT],
  [BudgetLineStatus.DEFERRED, BudgetLineStatus.ACTIVE],
  [BudgetLineStatus.ACTIVE, BudgetLineStatus.PENDING_VALIDATION],
  [BudgetLineStatus.ACTIVE, BudgetLineStatus.CLOSED],
  [BudgetLineStatus.ACTIVE, BudgetLineStatus.DEFERRED],
  [BudgetLineStatus.CLOSED, BudgetLineStatus.ARCHIVED],
];

const key = (from: BudgetLineStatus, to: BudgetLineStatus) => `${from}->${to}`;

const ALLOWED_SET = new Set(ALLOWED.map(([a, b]) => key(a, b)));

/** Pour tests (matrice exhaustive) et diagnostics. */
export function isBudgetLineStatusTransitionAllowed(
  from: BudgetLineStatus,
  to: BudgetLineStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_SET.has(key(from, to));
}

export function assertBudgetLineStatusTransition(
  from: BudgetLineStatus,
  to: BudgetLineStatus,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_SET.has(key(from, to))) {
    throw new BadRequestException({
      code: 'invalid_status_transition',
      message: `Invalid budget line status transition from ${from} to ${to}`,
    });
  }
}
