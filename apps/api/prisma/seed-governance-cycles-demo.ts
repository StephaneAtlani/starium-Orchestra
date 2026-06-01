import {
  GovernanceCycleCadence,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  GovernanceCycleStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { computePriorityScore } from "../src/modules/governance-cycles/lib/governance-cycle-scoring.util";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function projectCodePrefix(slug: string): string {
  const map: Record<string, string> = {
    "neotech-ai": "NEO",
    "batipro-groupe": "BAT",
    "medisys-sante": "MED",
    "globaltrans-france": "GTF",
    "globaltrans-germany": "GTG",
    "industria-group": "IND",
  };
  return map[slug] ?? slug.replace(/-/g, "").toUpperCase().slice(0, 5);
}

type ScoreInput = {
  valueScore: number;
  riskScore: number;
  budgetScore: number;
  capacityScore: number;
  alignmentScore: number;
};

function scores(input: ScoreInput) {
  const priorityScore = computePriorityScore(input);
  return { ...input, priorityScore };
}

async function findProjectByCode(
  prisma: PrismaClient,
  clientId: string,
  code: string,
) {
  return prisma.project.findFirst({
    where: { clientId, code },
    select: { id: true, name: true },
  });
}

async function upsertGovernanceCycle(
  prisma: PrismaClient,
  clientId: string,
  data: {
    code: string;
    name: string;
    cadence: GovernanceCycleCadence;
    status: GovernanceCycleStatus;
    startDate: Date;
    endDate: Date;
    sponsorLabel: string;
    objectiveSummary: string;
    decisionSummary?: string | null;
    validatedAt?: Date | null;
    validatedByUserId?: string | null;
    closedAt?: Date | null;
    createdByUserId?: string | null;
  },
) {
  const existing = await prisma.governanceCycle.findFirst({
    where: { clientId, code: data.code },
    select: { id: true },
  });
  const payload = {
    name: data.name,
    cadence: data.cadence,
    status: data.status,
    startDate: data.startDate,
    endDate: data.endDate,
    sponsorLabel: data.sponsorLabel,
    objectiveSummary: data.objectiveSummary,
    decisionSummary: data.decisionSummary ?? null,
    validatedAt: data.validatedAt ?? null,
    validatedByUserId: data.validatedByUserId ?? null,
    closedAt: data.closedAt ?? null,
    createdByUserId: data.createdByUserId ?? null,
  };
  if (existing) {
    return prisma.governanceCycle.update({
      where: { id: existing.id },
      data: payload,
    });
  }
  return prisma.governanceCycle.create({
    data: { clientId, code: data.code, ...payload },
  });
}

async function upsertProjectItem(
  prisma: PrismaClient,
  input: {
    clientId: string;
    cycleId: string;
    projectId: string;
    title: string;
    decisionStatus: GovernanceCycleItemDecisionStatus;
    decisionReason?: string | null;
    estimatedBudgetAmount?: string;
    estimatedCapacityDays?: string;
    score: ScoreInput;
  },
) {
  const { priorityScore, ...scoreFields } = scores(input.score);
  return prisma.governanceCycleItem.upsert({
    where: {
      cycleId_projectId: {
        cycleId: input.cycleId,
        projectId: input.projectId,
      },
    },
    create: {
      clientId: input.clientId,
      cycleId: input.cycleId,
      sourceType: GovernanceCycleItemSourceType.PROJECT,
      projectId: input.projectId,
      title: input.title,
      decisionStatus: input.decisionStatus,
      decisionReason: input.decisionReason ?? null,
      estimatedBudgetAmount: input.estimatedBudgetAmount
        ? new Prisma.Decimal(input.estimatedBudgetAmount)
        : null,
      estimatedCapacityDays: input.estimatedCapacityDays
        ? new Prisma.Decimal(input.estimatedCapacityDays)
        : null,
      ...scoreFields,
      priorityScore,
    },
    update: {
      title: input.title,
      decisionStatus: input.decisionStatus,
      decisionReason: input.decisionReason ?? null,
      estimatedBudgetAmount: input.estimatedBudgetAmount
        ? new Prisma.Decimal(input.estimatedBudgetAmount)
        : null,
      estimatedCapacityDays: input.estimatedCapacityDays
        ? new Prisma.Decimal(input.estimatedCapacityDays)
        : null,
      ...scoreFields,
      priorityScore,
    },
  });
}

async function upsertManualItem(
  prisma: PrismaClient,
  input: {
    clientId: string;
    cycleId: string;
    title: string;
    decisionStatus: GovernanceCycleItemDecisionStatus;
    description?: string;
    score?: Partial<ScoreInput>;
  },
) {
  const existing = await prisma.governanceCycleItem.findFirst({
    where: {
      clientId: input.clientId,
      cycleId: input.cycleId,
      sourceType: GovernanceCycleItemSourceType.MANUAL,
      title: input.title,
    },
    select: { id: true },
  });
  const fullScore: ScoreInput = {
    valueScore: input.score?.valueScore ?? 3,
    riskScore: input.score?.riskScore ?? 2,
    budgetScore: input.score?.budgetScore ?? 3,
    capacityScore: input.score?.capacityScore ?? 4,
    alignmentScore: input.score?.alignmentScore ?? 4,
  };
  const { priorityScore, ...scoreFields } = scores(fullScore);
  const data = {
    title: input.title,
    description: input.description ?? null,
    decisionStatus: input.decisionStatus,
    ...scoreFields,
    priorityScore,
  };
  if (existing) {
    return prisma.governanceCycleItem.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.governanceCycleItem.create({
    data: {
      clientId: input.clientId,
      cycleId: input.cycleId,
      sourceType: GovernanceCycleItemSourceType.MANUAL,
      ...data,
    },
  });
}

async function upsertBudgetItem(
  prisma: PrismaClient,
  input: {
    clientId: string;
    cycleId: string;
    budgetId: string;
    title: string;
    decisionStatus: GovernanceCycleItemDecisionStatus;
    score: ScoreInput;
  },
) {
  const existing = await prisma.governanceCycleItem.findFirst({
    where: {
      clientId: input.clientId,
      cycleId: input.cycleId,
      sourceType: GovernanceCycleItemSourceType.BUDGET,
      budgetId: input.budgetId,
    },
    select: { id: true },
  });
  const { priorityScore, ...scoreFields } = scores(input.score);
  const data = {
    title: input.title,
    decisionStatus: input.decisionStatus,
    budgetId: input.budgetId,
    ...scoreFields,
    priorityScore,
  };
  if (existing) {
    return prisma.governanceCycleItem.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.governanceCycleItem.create({
    data: {
      clientId: input.clientId,
      cycleId: input.cycleId,
      sourceType: GovernanceCycleItemSourceType.BUDGET,
      ...data,
    },
  });
}

/**
 * Cycles de pilotage + items démo (RFC-PROJ-CYCLE-001 / 002).
 * Idempotent : repère les cycles par `code` client-scopé ; items projet par `@@unique([cycleId, projectId])`.
 */
export async function ensureDemoGovernanceCycles(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  actorUserId: string | null,
): Promise<void> {
  const prefix = projectCodePrefix(slug);
  const now = new Date();
  const q2Start = addDaysUtc(now, -45);
  const q2End = addDaysUtc(now, 45);
  const yearStart = addDaysUtc(now, -120);
  const yearEnd = addDaysUtc(now, 240);

  const codirCycle = await upsertGovernanceCycle(prisma, clientId, {
    code: `${prefix}-CYCLE-CODIR-T2`,
    name: "Cycle CODIR — T2 2026",
    cadence: GovernanceCycleCadence.QUARTERLY,
    status: GovernanceCycleStatus.TO_ARBITRATE,
    startDate: q2Start,
    endDate: q2End,
    sponsorLabel: "DSI — Comité de direction",
    objectiveSummary:
      "Arbitrer le portefeuille projets prioritaires du trimestre (capacité, budget, risques).",
    decisionSummary: null,
    validatedAt: addDaysUtc(now, -7),
    validatedByUserId: actorUserId,
    createdByUserId: actorUserId,
  });

  const projectSpecs: Array<{
    suffix: string;
    decision: GovernanceCycleItemDecisionStatus;
    reason?: string;
    budget?: string;
    capacity?: string;
    score: ScoreInput;
  }> = [
    {
      suffix: "01",
      decision: GovernanceCycleItemDecisionStatus.ACCEPTED,
      reason: "Socle sécurité validé — lancement confirmé.",
      budget: "185000.00",
      capacity: "120.00",
      score: { valueScore: 5, riskScore: 2, budgetScore: 4, capacityScore: 3, alignmentScore: 5 },
    },
    {
      suffix: "02",
      decision: GovernanceCycleItemDecisionStatus.DEFERRED,
      reason: "Capacité équipe insuffisante avant refonte data.",
      budget: "420000.00",
      capacity: "280.00",
      score: { valueScore: 4, riskScore: 3, budgetScore: 3, capacityScore: 2, alignmentScore: 4 },
    },
    {
      suffix: "03",
      decision: GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
      reason: "Dépendance fournisseur cloud à clarifier.",
      budget: "95000.00",
      capacity: "65.00",
      score: { valueScore: 4, riskScore: 4, budgetScore: 4, capacityScore: 3, alignmentScore: 4 },
    },
    {
      suffix: "07",
      decision: GovernanceCycleItemDecisionStatus.CANDIDATE,
      budget: "210000.00",
      capacity: "90.00",
      score: { valueScore: 3, riskScore: 4, budgetScore: 3, capacityScore: 2, alignmentScore: 3 },
    },
  ];

  for (const spec of projectSpecs) {
    const project = await findProjectByCode(
      prisma,
      clientId,
      `${prefix}-SEED-${spec.suffix}`,
    );
    if (!project) continue;
    await upsertProjectItem(prisma, {
      clientId,
      cycleId: codirCycle.id,
      projectId: project.id,
      title: project.name,
      decisionStatus: spec.decision,
      decisionReason: spec.reason ?? null,
      estimatedBudgetAmount: spec.budget,
      estimatedCapacityDays: spec.capacity,
      score: spec.score,
    });
  }

  await upsertManualItem(prisma, {
    clientId,
    cycleId: codirCycle.id,
    title: "Renfort capacité équipe RUN (hors projet)",
    description: "Demande de renfort ETP pour stabiliser l’exploitation avant nouveaux projets.",
    decisionStatus: GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
    score: { valueScore: 3, riskScore: 2, budgetScore: 3, capacityScore: 5, alignmentScore: 4 },
  });

  const budgetCycle = await upsertGovernanceCycle(prisma, clientId, {
    code: `${prefix}-CYCLE-BUDGET-2026`,
    name: "Cycle pilotage budget IT 2026",
    cadence: GovernanceCycleCadence.YEARLY,
    status: GovernanceCycleStatus.ARBITRATED,
    startDate: yearStart,
    endDate: yearEnd,
    sponsorLabel: "DAF + DSI",
    objectiveSummary: "Valider les enveloppes et arbitrages budget IT annuels.",
    decisionSummary:
      "Deux projets retenus, un refusé, un retenu sous réserve — enveloppe globale validée.",
    validatedAt: addDaysUtc(now, -30),
    validatedByUserId: actorUserId,
    createdByUserId: actorUserId,
  });

  const budgetArbitrationProjects: Array<{
    suffix: string;
    decision: GovernanceCycleItemDecisionStatus;
    reason?: string;
    score: ScoreInput;
  }> = [
    {
      suffix: "04",
      decision: GovernanceCycleItemDecisionStatus.ACCEPTED,
      score: { valueScore: 4, riskScore: 2, budgetScore: 5, capacityScore: 4, alignmentScore: 4 },
    },
    {
      suffix: "05",
      decision: GovernanceCycleItemDecisionStatus.REJECTED,
      reason: "ROI insuffisant vs priorités sécurité.",
      score: { valueScore: 2, riskScore: 3, budgetScore: 2, capacityScore: 3, alignmentScore: 2 },
    },
    {
      suffix: "06",
      decision: GovernanceCycleItemDecisionStatus.ACCEPTED_WITH_RESERVE,
      reason: "Retenu sous réserve de validation fournisseur.",
      score: { valueScore: 4, riskScore: 3, budgetScore: 4, capacityScore: 3, alignmentScore: 4 },
    },
  ];

  for (const spec of budgetArbitrationProjects) {
    const project = await findProjectByCode(
      prisma,
      clientId,
      `${prefix}-SEED-${spec.suffix}`,
    );
    if (!project) continue;
    await upsertProjectItem(prisma, {
      clientId,
      cycleId: budgetCycle.id,
      projectId: project.id,
      title: project.name,
      decisionStatus: spec.decision,
      decisionReason: spec.reason ?? null,
      score: spec.score,
    });
  }

  const firstBudget = await prisma.budget.findFirst({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (firstBudget) {
    await upsertBudgetItem(prisma, {
      clientId,
      cycleId: budgetCycle.id,
      budgetId: firstBudget.id,
      title: firstBudget.name,
      decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
      score: { valueScore: 5, riskScore: 1, budgetScore: 5, capacityScore: 3, alignmentScore: 5 },
    });
  }

  console.log(
    `✅ Cycles de pilotage démo [${slug}] : « ${codirCycle.name} » + « ${budgetCycle.name} »`,
  );
}
