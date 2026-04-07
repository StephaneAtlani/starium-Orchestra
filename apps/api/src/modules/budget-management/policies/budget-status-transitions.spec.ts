import { BadRequestException } from '@nestjs/common';
import {
  BudgetEnvelopeStatus,
  BudgetLineStatus,
  BudgetStatus,
} from '@prisma/client';
import { assertBudgetStatusTransition, isBudgetStatusTransitionAllowed } from './budget-status-transitions';
import {
  assertBudgetEnvelopeStatusTransition,
  isBudgetEnvelopeStatusTransitionAllowed,
} from './budget-envelope-status-transitions';
import {
  assertBudgetLineStatusTransition,
  isBudgetLineStatusTransitionAllowed,
} from './budget-line-status-transitions';

describe('BudgetStatus transitions (matrice exhaustive)', () => {
  for (const from of Object.values(BudgetStatus)) {
    for (const to of Object.values(BudgetStatus)) {
      it(`${from} → ${to}`, () => {
        const allowed = isBudgetStatusTransitionAllowed(from, to);
        if (allowed) {
          expect(() => assertBudgetStatusTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertBudgetStatusTransition(from, to)).toThrow(BadRequestException);
        }
      });
    }
  }
});

describe('BudgetLineStatus transitions (matrice exhaustive)', () => {
  for (const from of Object.values(BudgetLineStatus)) {
    for (const to of Object.values(BudgetLineStatus)) {
      it(`${from} → ${to}`, () => {
        const allowed = isBudgetLineStatusTransitionAllowed(from, to);
        if (allowed) {
          expect(() => assertBudgetLineStatusTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertBudgetLineStatusTransition(from, to)).toThrow(BadRequestException);
        }
      });
    }
  }
});

describe('BudgetEnvelopeStatus transitions (matrice exhaustive)', () => {
  for (const from of Object.values(BudgetEnvelopeStatus)) {
    for (const to of Object.values(BudgetEnvelopeStatus)) {
      it(`${from} → ${to}`, () => {
        const allowed = isBudgetEnvelopeStatusTransitionAllowed(from, to);
        if (allowed) {
          expect(() => assertBudgetEnvelopeStatusTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertBudgetEnvelopeStatusTransition(from, to)).toThrow(BadRequestException);
        }
      });
    }
  }
});
