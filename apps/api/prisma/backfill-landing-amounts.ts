/**
 * Backfill RFC-BUD-040 — recalcule landingAmount pour toutes les lignes live.
 * Usage: pnpm --filter @starium-orchestra/api exec ts-node prisma/backfill-landing-amounts.ts
 */
import { PrismaClient } from '@prisma/client';
import { defaultReferenceDateUtc } from '@starium-orchestra/budget-exercise-calendar';
import { calculateLanding } from '../src/modules/budget-landing/budget-landing.calculator';
import { computeEffectiveBudgetBase } from '../src/modules/financial-core/budget-line-amounts.aggregate';

const prisma = new PrismaClient();

async function main() {
  const referenceDate = defaultReferenceDateUtc();
  const lines = await prisma.budgetLine.findMany({
    select: {
      id: true,
      clientId: true,
      initialAmount: true,
      consumedAmount: true,
      committedAmount: true,
      planningMonths: { select: { monthIndex: true, amount: true } },
      budget: {
        select: {
          exercise: { select: { startDate: true, endDate: true } },
        },
      },
    },
  });

  let updated = 0;
  for (const line of lines) {
    const events = await prisma.financialEvent.findMany({
      where: { budgetLineId: line.id, clientId: line.clientId },
      select: { eventType: true, amountHt: true },
    });
    const effectiveBudgetBase = computeEffectiveBudgetBase(
      line.initialAmount,
      events,
    );
    const result = calculateLanding({
      effectiveBudgetBase,
      consumedAmount: line.consumedAmount,
      committedAmount: line.committedAmount,
      exerciseStart: line.budget.exercise.startDate,
      exerciseEnd: line.budget.exercise.endDate,
      referenceDate,
      planningMonths: line.planningMonths,
    });

    await prisma.budgetLine.update({
      where: { id: line.id },
      data: {
        landingAmount: result.landingAmount,
        landingComputedAt: new Date(),
        forecastAmount: result.landingAmount,
        planningTotalAmount: result.planningTotalAmount,
      },
    });
    updated += 1;
  }

  console.log(`Backfill landing: ${updated} lignes mises à jour.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
