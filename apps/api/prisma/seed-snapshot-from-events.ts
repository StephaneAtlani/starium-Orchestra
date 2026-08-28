/**
 * Crée une version figée alignée sur la même logique que `BudgetSnapshotsService.create` :
 * montants par ligne = agrégation des mouvements (événements + affectations) jusqu’à la date de capture.
 *
 * Utilisé par la seed cockpit pour des chiffres cohérents avec commandes / factures / dates.
 */

import {
  Prisma,
  PrismaClient,
  BudgetLineStatus,
  BudgetSnapshotStatus,
} from "@prisma/client";
import { randomBytes } from "crypto";
import {
  aggregateBudgetLineAmounts,
  snapshotAsOfInclusiveEndUtc,
} from "../src/modules/financial-core/budget-line-amounts.aggregate";
import { calculateLanding } from "../src/modules/budget-landing/budget-landing.calculator";

const SNAP_CODE_SUFFIX_BYTES = 3;
const MAX_CODE_RETRIES = 8;

function toNum(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d);
}

function formatSnapshotDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function generateSnapshotCode(snapshotDate: Date): string {
  const suffix = randomBytes(SNAP_CODE_SUFFIX_BYTES).toString("hex");
  return `SNAP-${formatSnapshotDate(snapshotDate)}-${suffix}`;
}

function groupByLineId<T extends { budgetLineId: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const row of rows) {
    const arr = m.get(row.budgetLineId) ?? [];
    arr.push(row);
    m.set(row.budgetLineId, arr);
  }
  return m;
}

/**
 * Recalcule engagé / consommé / restant / atterrissage à partir des mouvements et du planning (RFC-BUD-040).
 */
export async function syncBudgetLineAggregatedAmounts(
  prisma: PrismaClient,
  budgetLineId: string,
  clientId: string,
): Promise<void> {
  const line = await prisma.budgetLine.findUniqueOrThrow({
    where: { id: budgetLineId, clientId },
    select: {
      initialAmount: true,
      budget: {
        select: {
          exercise: { select: { startDate: true, endDate: true } },
        },
      },
      planningMonths: { select: { monthIndex: true, amount: true } },
    },
  });
  const [allocations, events] = await Promise.all([
    prisma.financialAllocation.findMany({
      where: { budgetLineId, clientId },
      select: { allocationType: true, allocatedAmount: true },
    }),
    prisma.financialEvent.findMany({
      where: { budgetLineId, clientId },
      select: { eventType: true, amountHt: true },
    }),
  ]);

  const aggregated = aggregateBudgetLineAmounts(
    line.initialAmount,
    events.map((e) => ({
      eventType: e.eventType,
      amountHt: e.amountHt,
    })),
    allocations.map((a) => ({
      allocationType: a.allocationType,
      allocatedAmount: a.allocatedAmount,
    })),
  );

  const landingResult = calculateLanding({
    effectiveBudgetBase: aggregated.effectiveBudgetBase,
    consumedAmount: aggregated.consumedAmount,
    committedAmount: aggregated.committedAmount,
    exerciseStart: line.budget.exercise.startDate,
    exerciseEnd: line.budget.exercise.endDate,
    referenceDate: new Date(),
    planningMonths: line.planningMonths,
  });

  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: {
      committedAmount: aggregated.committedAmount.toDecimalPlaces(2),
      consumedAmount: aggregated.consumedAmount.toDecimalPlaces(2),
      remainingAmount: aggregated.remainingAmount.toDecimalPlaces(2),
      planningTotalAmount: landingResult.planningTotalAmount,
      forecastAmount: landingResult.landingAmount,
      landingAmount: landingResult.landingAmount,
      landingComputedAt: new Date(),
    },
  });
}

/**
 * Insère une version figée dont les montants sont dérivés des mouvements ≤ fin de jour UTC de `snapshotDate`.
 */
export async function createBudgetSnapshotFromEvents(
  prisma: PrismaClient,
  budgetId: string,
  name: string,
  snapshotDate: Date,
): Promise<void> {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId },
    include: { exercise: true },
  });
  if (!budget) {
    console.warn(`[seed-snapshot-from-events] budget ${budgetId} introuvable`);
    return;
  }

  const clientId = budget.clientId;
  const lines = await prisma.budgetLine.findMany({
    where: {
      budgetId,
      clientId,
      status: BudgetLineStatus.ACTIVE,
    },
    include: {
      envelope: true,
      planningMonths: { select: { monthIndex: true, amount: true } },
    },
  });

  const asOfEnd = snapshotAsOfInclusiveEndUtc(snapshotDate);
  const lineIds = lines.map((l) => l.id);

  const [movementEvents, movementAllocations] =
    lineIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.financialEvent.findMany({
            where: {
              clientId,
              budgetLineId: { in: lineIds },
              eventDate: { lte: asOfEnd },
            },
            select: { budgetLineId: true, eventType: true, amountHt: true },
          }),
          prisma.financialAllocation.findMany({
            where: {
              clientId,
              budgetLineId: { in: lineIds },
              OR: [
                { effectiveDate: { lte: asOfEnd } },
                {
                  AND: [
                    { effectiveDate: null },
                    { createdAt: { lte: asOfEnd } },
                  ],
                },
              ],
            },
            select: {
              budgetLineId: true,
              allocationType: true,
              allocatedAmount: true,
            },
          }),
        ]);

  const eventsByLine = groupByLineId(movementEvents);
  const allocsByLine = groupByLineId(movementAllocations);

  const lineSnapshots = lines.map((line) => {
    const evs =
      eventsByLine.get(line.id)?.map((e) => ({
        eventType: e.eventType,
        amountHt: e.amountHt,
      })) ?? [];
    const allocs =
      allocsByLine.get(line.id)?.map((a) => ({
        allocationType: a.allocationType,
        allocatedAmount: a.allocatedAmount,
      })) ?? [];
    const agg = aggregateBudgetLineAmounts(line.initialAmount, evs, allocs);
    const landingResult = calculateLanding({
      effectiveBudgetBase: agg.effectiveBudgetBase,
      consumedAmount: agg.consumedAmount,
      committedAmount: agg.committedAmount,
      exerciseStart: budget.exercise.startDate,
      exerciseEnd: budget.exercise.endDate,
      referenceDate: snapshotDate,
      planningMonths: line.planningMonths,
    });
    return { line, agg, landingResult };
  });

  const totalInitial = lines.reduce((s, l) => s + toNum(l.initialAmount), 0);
  const totalForecast = lineSnapshots.reduce(
    (s, { landingResult }) => s + toNum(landingResult.landingAmount),
    0,
  );
  const totalCommitted = lineSnapshots.reduce(
    (s, { agg }) => s + toNum(agg.committedAmount),
    0,
  );
  const totalConsumed = lineSnapshots.reduce(
    (s, { agg }) => s + toNum(agg.consumedAmount),
    0,
  );
  const totalRemaining = lineSnapshots.reduce(
    (s, { agg }) => s + toNum(agg.remainingAmount),
    0,
  );

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateSnapshotCode(snapshotDate);
    try {
      await prisma.$transaction(async (tx) => {
        const snap = await tx.budgetSnapshot.create({
          data: {
            clientId,
            budgetId: budget.id,
            exerciseId: budget.exerciseId,
            name,
            code,
            description:
              "Seed : version figée alignée sur agrégation des mouvements à la date de capture.",
            snapshotDate,
            status: BudgetSnapshotStatus.ACTIVE,
            budgetName: budget.name,
            budgetCode: budget.code,
            budgetCurrency: budget.currency,
            budgetStatus: budget.status,
            totalInitialAmount: new Prisma.Decimal(totalInitial),
            totalForecastAmount: new Prisma.Decimal(totalForecast),
            totalCommittedAmount: new Prisma.Decimal(totalCommitted),
            totalConsumedAmount: new Prisma.Decimal(totalConsumed),
            totalRemainingAmount: new Prisma.Decimal(totalRemaining),
            createdByUserId: null,
          },
        });
        if (lineSnapshots.length > 0) {
          await tx.budgetSnapshotLine.createMany({
            data: lineSnapshots.map(({ line, agg, landingResult }) => ({
              snapshotId: snap.id,
              clientId,
              budgetLineId: line.id,
              budgetId: line.budgetId,
              envelopeId: line.envelopeId,
              envelopeName: line.envelope.name,
              envelopeCode: line.envelope.code,
              envelopeType: line.envelope.type,
              lineCode: line.code,
              lineName: line.name,
              expenseType: line.expenseType,
              currency: line.currency,
              lineStatus: line.status,
              initialAmount: line.initialAmount,
              forecastAmount: landingResult.landingAmount,
              landingAmount: landingResult.landingAmount,
              committedAmount: agg.committedAmount,
              consumedAmount: agg.consumedAmount,
              remainingAmount: agg.remainingAmount,
            })),
          });
        }
      });
      return;
    } catch (err: unknown) {
      lastError = err;
      const isP2002 =
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (!isP2002) throw err;
    }
  }
  throw lastError ?? new Error("createBudgetSnapshotFromEvents: échec code unique");
}
