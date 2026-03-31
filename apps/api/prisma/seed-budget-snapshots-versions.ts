/**
 * Remplit les budgets existants avec :
 * - un jeu de versions (baseline = budget courant + révision brouillon V2) ;
 * - deux snapshots par budget (idempotent).
 *
 * Exécuté depuis prisma/seed.ts après création des budgets.
 */

import { randomBytes } from "crypto";
import {
  Prisma,
  PrismaClient,
  BudgetVersionKind,
  BudgetVersionStatus,
  BudgetSnapshotStatus,
} from "@prisma/client";

const SNAP_CODE_SUFFIX_BYTES = 3;
const MAX_CODE_RETRIES = 8;
const TARGET_SNAPSHOTS_PER_BUDGET = 2;

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

type LineWithSplits = Prisma.BudgetLineGetPayload<{
  include: { costCenterSplits: true };
}>;

async function cloneBudgetLineWithAnalytics(
  tx: Prisma.TransactionClient,
  clientId: string,
  sourceLine: LineWithSplits,
  newBudgetId: string,
  newEnvelopeId: string,
): Promise<void> {
  const newLine = await tx.budgetLine.create({
    data: {
      clientId,
      budgetId: newBudgetId,
      envelopeId: newEnvelopeId,
      code: sourceLine.code,
      name: sourceLine.name,
      description: sourceLine.description,
      expenseType: sourceLine.expenseType,
      status: sourceLine.status,
      currency: sourceLine.currency,
      taxRate: sourceLine.taxRate,
      generalLedgerAccountId: sourceLine.generalLedgerAccountId,
      analyticalLedgerAccountId: sourceLine.analyticalLedgerAccountId,
      allocationScope: sourceLine.allocationScope,
      planningMode: sourceLine.planningMode,
      planningTotalAmount: sourceLine.planningTotalAmount,
      initialAmount: sourceLine.initialAmount,
      revisedAmount: sourceLine.revisedAmount,
      forecastAmount: sourceLine.forecastAmount,
      committedAmount: sourceLine.committedAmount,
      consumedAmount: sourceLine.consumedAmount,
      remainingAmount: sourceLine.remainingAmount,
    },
  });
  if (sourceLine.costCenterSplits?.length) {
    for (const split of sourceLine.costCenterSplits) {
      await tx.budgetLineCostCenterSplit.create({
        data: {
          clientId,
          budgetLineId: newLine.id,
          costCenterId: split.costCenterId,
          percentage: split.percentage,
        },
      });
    }
  }
}

export async function attachVersionSetInPlace(
  prisma: PrismaClient,
  budgetId: string,
): Promise<boolean> {
  const b = await prisma.budget.findUnique({
    where: { id: budgetId },
  });
  if (!b || b.versionSetId) return false;

  const vsCode = `${b.code}-vs-${b.id.slice(-8)}`;

  const vs = await prisma.budgetVersionSet.create({
    data: {
      clientId: b.clientId,
      exerciseId: b.exerciseId,
      code: vsCode,
      name: `${b.name} — jeu de versions`,
      description: "Seed : jeu de versions budgétaire (baseline = budget actuel)",
    },
  });

  await prisma.$transaction([
    prisma.budget.update({
      where: { id: b.id },
      data: {
        versionSetId: vs.id,
        versionNumber: 1,
        versionLabel: "V1",
        versionKind: BudgetVersionKind.BASELINE,
        versionStatus: BudgetVersionStatus.ACTIVE,
        isVersioned: true,
        activatedAt: new Date(),
      },
    }),
    prisma.budgetVersionSet.update({
      where: { id: vs.id },
      data: {
        baselineBudgetId: b.id,
        activeBudgetId: b.id,
      },
    }),
  ]);
  return true;
}

export async function ensureDraftRevision(
  prisma: PrismaClient,
  budgetId: string,
): Promise<boolean> {
  const source = await prisma.budget.findFirst({
    where: { id: budgetId },
    include: {
      versionSet: true,
      envelopes: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      budgetLines: { include: { costCenterSplits: true } },
    },
  });
  if (!source?.versionSetId || !source.versionSet) return false;

  const existing = await prisma.budget.count({
    where: { versionSetId: source.versionSetId },
  });
  if (existing >= 2) return false;

  const maxVersion = await prisma.budget.aggregate({
    where: { versionSetId: source.versionSetId },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (maxVersion._max.versionNumber ?? 0) + 1;
  const versionSetCode = source.versionSet.code;
  const newBudgetCode = `${versionSetCode}-V${nextVersionNumber}`;

  await prisma.$transaction(async (tx) => {
    const newBudget = await tx.budget.create({
      data: {
        clientId: source.clientId,
        exerciseId: source.exerciseId,
        name: source.name,
        code: newBudgetCode,
        description: source.description,
        currency: source.currency,
        status: source.status,
        ownerUserId: source.ownerUserId,
        versionSetId: source.versionSetId!,
        versionNumber: nextVersionNumber,
        versionLabel: `V${nextVersionNumber}`,
        versionKind: BudgetVersionKind.REVISION,
        versionStatus: BudgetVersionStatus.DRAFT,
        parentBudgetId: source.id,
        isVersioned: true,
      },
    });

    const envelopeIdMap = new Map<string, string>();
    for (const env of source.envelopes) {
      const created = await tx.budgetEnvelope.create({
        data: {
          clientId: source.clientId,
          budgetId: newBudget.id,
          parentId: null,
          name: env.name,
          code: env.code,
          type: env.type,
          description: env.description,
          sortOrder: env.sortOrder,
        },
      });
      envelopeIdMap.set(env.id, created.id);
    }
    for (const env of source.envelopes) {
      if (env.parentId && envelopeIdMap.has(env.parentId)) {
        const newId = envelopeIdMap.get(env.id)!;
        await tx.budgetEnvelope.update({
          where: { id: newId },
          data: { parentId: envelopeIdMap.get(env.parentId)! },
        });
      }
    }
    for (const line of source.budgetLines) {
      const newEnvelopeId = envelopeIdMap.get(line.envelopeId);
      if (!newEnvelopeId) continue;
      await cloneBudgetLineWithAnalytics(
        tx,
        source.clientId,
        line,
        newBudget.id,
        newEnvelopeId,
      );
    }
  });
  return true;
}

async function createOneSnapshot(
  prisma: PrismaClient,
  budgetId: string,
  name: string,
  snapshotDate: Date,
): Promise<void> {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId },
    include: { exercise: true },
  });
  if (!budget) return;

  const lines = await prisma.budgetLine.findMany({
    where: { budgetId: budget.id, clientId: budget.clientId },
    include: { envelope: true },
  });

  const totalInitial = lines.reduce((s, l) => s + toNum(l.initialAmount), 0);
  const totalRevised = lines.reduce((s, l) => s + toNum(l.revisedAmount), 0);
  const totalForecast = lines.reduce((s, l) => s + toNum(l.forecastAmount), 0);
  const totalCommitted = lines.reduce((s, l) => s + toNum(l.committedAmount), 0);
  const totalConsumed = lines.reduce((s, l) => s + toNum(l.consumedAmount), 0);
  const totalRemaining = lines.reduce((s, l) => s + toNum(l.remainingAmount), 0);

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateSnapshotCode(snapshotDate);
    try {
      await prisma.$transaction(async (tx) => {
        const snap = await tx.budgetSnapshot.create({
          data: {
            clientId: budget.clientId,
            budgetId: budget.id,
            exerciseId: budget.exerciseId,
            name,
            code,
            description: null,
            snapshotDate,
            status: BudgetSnapshotStatus.ACTIVE,
            budgetName: budget.name,
            budgetCode: budget.code,
            budgetCurrency: budget.currency,
            budgetStatus: budget.status,
            totalInitialAmount: new Prisma.Decimal(totalInitial),
            totalRevisedAmount: new Prisma.Decimal(totalRevised),
            totalForecastAmount: new Prisma.Decimal(totalForecast),
            totalCommittedAmount: new Prisma.Decimal(totalCommitted),
            totalConsumedAmount: new Prisma.Decimal(totalConsumed),
            totalRemainingAmount: new Prisma.Decimal(totalRemaining),
            createdByUserId: null,
          },
        });
        if (lines.length > 0) {
          await tx.budgetSnapshotLine.createMany({
            data: lines.map((line) => ({
              snapshotId: snap.id,
              clientId: budget.clientId,
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
              revisedAmount: line.revisedAmount,
              forecastAmount: line.forecastAmount,
              committedAmount: line.committedAmount,
              consumedAmount: line.consumedAmount,
              remainingAmount: line.remainingAmount,
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
  throw lastError ?? new Error("createOneSnapshot: échec code unique");
}

export async function ensureSnapshotsForBudget(
  prisma: PrismaClient,
  budgetId: string,
  budgetCode: string,
): Promise<number> {
  let created = 0;
  const base = new Date();
  let n = await prisma.budgetSnapshot.count({ where: { budgetId } });
  let offset = 0;
  while (n < TARGET_SNAPSHOTS_PER_BUDGET) {
    const snapshotDate = new Date(
      base.getFullYear(),
      base.getMonth() - (2 - offset),
      15,
    );
    await createOneSnapshot(
      prisma,
      budgetId,
      `Seed ${offset + 1}/${TARGET_SNAPSHOTS_PER_BUDGET} — ${budgetCode}`,
      snapshotDate,
    );
    created++;
    n = await prisma.budgetSnapshot.count({ where: { budgetId } });
    offset++;
    if (offset > 12) break;
  }
  return created;
}

export async function ensureBudgetSnapshotsAndVersions(
  prisma: PrismaClient,
): Promise<void> {
  const budgets = await prisma.budget.findMany({
    orderBy: [{ clientId: "asc" }, { code: "asc" }],
    select: { id: true, code: true, versionSetId: true },
  });

  let attached = 0;
  let revisions = 0;

  for (const b of budgets) {
    try {
      if (!b.versionSetId) {
        if (await attachVersionSetInPlace(prisma, b.id)) attached++;
      }
      if (await ensureDraftRevision(prisma, b.id)) revisions++;
    } catch (e) {
      console.warn(
        `⚠️  [seed-budget-snapshots-versions] versioning ${b.code} (${b.id}) :`,
        e,
      );
    }
  }

  const allBudgets = await prisma.budget.findMany({
    orderBy: [{ clientId: "asc" }, { code: "asc" }],
    select: { id: true, code: true },
  });

  let snapshotsAdded = 0;
  for (const b of allBudgets) {
    try {
      snapshotsAdded += await ensureSnapshotsForBudget(prisma, b.id, b.code);
    } catch (e) {
      console.warn(
        `⚠️  [seed-budget-snapshots-versions] snapshots ${b.code} (${b.id}) :`,
        e,
      );
    }
  }

  console.log(
    `✅ Budgets — snapshots & versions : ${attached} jeu(x) de versions créé(s), ${revisions} révision(s) brouillon V2, +${snapshotsAdded} snapshot(s) (${TARGET_SNAPSHOTS_PER_BUDGET} cible/budget, ${allBudgets.length} budget(s)).`,
  );
}
