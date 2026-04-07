import { BadRequestException } from '@nestjs/common';
import { BudgetEnvelopeStatus } from '@prisma/client';

const ALLOWED: ReadonlyArray<readonly [BudgetEnvelopeStatus, BudgetEnvelopeStatus]> =
  [
    [BudgetEnvelopeStatus.DRAFT, BudgetEnvelopeStatus.PENDING_VALIDATION],
    [BudgetEnvelopeStatus.DRAFT, BudgetEnvelopeStatus.ARCHIVED],
    [
      BudgetEnvelopeStatus.PENDING_VALIDATION,
      BudgetEnvelopeStatus.ACTIVE,
    ],
    [
      BudgetEnvelopeStatus.PENDING_VALIDATION,
      BudgetEnvelopeStatus.REJECTED,
    ],
    [
      BudgetEnvelopeStatus.PENDING_VALIDATION,
      BudgetEnvelopeStatus.DEFERRED,
    ],
    [BudgetEnvelopeStatus.REJECTED, BudgetEnvelopeStatus.DRAFT],
    [BudgetEnvelopeStatus.DEFERRED, BudgetEnvelopeStatus.DRAFT],
    [BudgetEnvelopeStatus.DEFERRED, BudgetEnvelopeStatus.ACTIVE],
    [
      BudgetEnvelopeStatus.ACTIVE,
      BudgetEnvelopeStatus.PENDING_VALIDATION,
    ],
    [BudgetEnvelopeStatus.ACTIVE, BudgetEnvelopeStatus.LOCKED],
    [BudgetEnvelopeStatus.ACTIVE, BudgetEnvelopeStatus.DEFERRED],
    [BudgetEnvelopeStatus.LOCKED, BudgetEnvelopeStatus.ARCHIVED],
  ];

const key = (from: BudgetEnvelopeStatus, to: BudgetEnvelopeStatus) =>
  `${from}->${to}`;

const ALLOWED_SET = new Set(ALLOWED.map(([a, b]) => key(a, b)));

export function isBudgetEnvelopeStatusTransitionAllowed(
  from: BudgetEnvelopeStatus,
  to: BudgetEnvelopeStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_SET.has(key(from, to));
}

export function assertBudgetEnvelopeStatusTransition(
  from: BudgetEnvelopeStatus,
  to: BudgetEnvelopeStatus,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_SET.has(key(from, to))) {
    throw new BadRequestException({
      code: 'invalid_status_transition',
      message: `Invalid budget envelope status transition from ${from} to ${to}`,
    });
  }
}
