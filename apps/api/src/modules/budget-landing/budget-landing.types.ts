import { Prisma } from '@prisma/client';

export type LandingPlanningMonth = {
  monthIndex: number;
  amount: Prisma.Decimal | number | string;
};

export type LandingInput = {
  effectiveBudgetBase: Prisma.Decimal | number | string;
  consumedAmount: Prisma.Decimal | number | string;
  committedAmount: Prisma.Decimal | number | string;
  exerciseStart: Date;
  exerciseEnd: Date;
  referenceDate: Date;
  planningMonths: LandingPlanningMonth[];
};

export type LandingResult = {
  planningTotalAmount: Prisma.Decimal;
  remainingPlanning: Prisma.Decimal;
  landingAmount: Prisma.Decimal;
  landingVariance: Prisma.Decimal;
  planningDelta: Prisma.Decimal;
};

export type LandingLineStatus = 'OK' | 'WARNING' | 'CRITICAL';
