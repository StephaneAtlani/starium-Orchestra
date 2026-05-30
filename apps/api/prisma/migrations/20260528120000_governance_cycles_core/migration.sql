-- RFC-PROJ-CYCLE-001 — Cycles de pilotage (gouvernance / arbitrage CODIR)

-- CreateEnum
CREATE TYPE "GovernanceCycleCadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMESTERLY', 'YEARLY', 'ONE_SHOT', 'CONTINUOUS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GovernanceCycleStatus" AS ENUM ('DRAFT', 'PREPARING', 'TO_ARBITRATE', 'ARBITRATED', 'IN_EXECUTION', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GovernanceCycleItemSourceType" AS ENUM ('PROJECT', 'STRATEGIC_OBJECTIVE', 'BUDGET', 'BUDGET_LINE', 'RISK', 'MANUAL');

-- CreateEnum
CREATE TYPE "GovernanceCycleItemDecisionStatus" AS ENUM ('CANDIDATE', 'TO_ARBITRATE', 'ACCEPTED', 'DEFERRED', 'REJECTED', 'NEEDS_INFORMATION', 'ACCEPTED_WITH_RESERVE');

-- CreateTable
CREATE TABLE "GovernanceCycle" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "cadence" "GovernanceCycleCadence" NOT NULL,
    "status" "GovernanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sponsorLabel" TEXT,
    "objectiveSummary" TEXT,
    "decisionSummary" TEXT,
    "createdByUserId" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceCycleItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "sourceType" "GovernanceCycleItemSourceType" NOT NULL,
    "projectId" TEXT,
    "strategicObjectiveId" TEXT,
    "budgetId" TEXT,
    "budgetLineId" TEXT,
    "riskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "decisionStatus" "GovernanceCycleItemDecisionStatus" NOT NULL DEFAULT 'CANDIDATE',
    "decisionReason" TEXT,
    "valueScore" INTEGER,
    "riskScore" INTEGER,
    "budgetScore" INTEGER,
    "capacityScore" INTEGER,
    "alignmentScore" INTEGER,
    "priorityScore" INTEGER,
    "estimatedBudgetAmount" DECIMAL(18,2),
    "estimatedCapacityDays" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceCycleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernanceCycle_clientId_idx" ON "GovernanceCycle"("clientId");

-- CreateIndex
CREATE INDEX "GovernanceCycle_clientId_status_idx" ON "GovernanceCycle"("clientId", "status");

-- CreateIndex
CREATE INDEX "GovernanceCycle_clientId_cadence_idx" ON "GovernanceCycle"("clientId", "cadence");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_clientId_idx" ON "GovernanceCycleItem"("clientId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_cycleId_idx" ON "GovernanceCycleItem"("cycleId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_projectId_idx" ON "GovernanceCycleItem"("projectId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_strategicObjectiveId_idx" ON "GovernanceCycleItem"("strategicObjectiveId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_budgetId_idx" ON "GovernanceCycleItem"("budgetId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_budgetLineId_idx" ON "GovernanceCycleItem"("budgetLineId");

-- CreateIndex
CREATE INDEX "GovernanceCycleItem_riskId_idx" ON "GovernanceCycleItem"("riskId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceCycleItem_cycleId_projectId_key" ON "GovernanceCycleItem"("cycleId", "projectId");

-- AddForeignKey
ALTER TABLE "GovernanceCycle" ADD CONSTRAINT "GovernanceCycle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "GovernanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_strategicObjectiveId_fkey" FOREIGN KEY ("strategicObjectiveId") REFERENCES "StrategicObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleItem" ADD CONSTRAINT "GovernanceCycleItem_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "ProjectRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
