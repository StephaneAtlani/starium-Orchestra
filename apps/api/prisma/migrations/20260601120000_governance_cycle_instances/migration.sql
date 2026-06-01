-- RFC-PROJ-CYCLE-003 — Instances de décision (lot 003-A)

-- CreateEnum
CREATE TYPE "GovernanceCycleInstanceMode" AS ENUM ('MEETING', 'DECISION_RECORD', 'VOTE');

-- CreateEnum
CREATE TYPE "GovernanceCycleInstanceStatus" AS ENUM ('DRAFT', 'PLANNED', 'OPEN', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "GovernanceCycle" ADD COLUMN IF NOT EXISTS "governanceConfig" JSONB;

-- CreateTable
CREATE TABLE "GovernanceCycleInstance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "periodLabel" TEXT,
    "periodStartDate" DATE,
    "periodEndDate" DATE,
    "label" TEXT,
    "scheduledDecisionAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "mode" "GovernanceCycleInstanceMode" NOT NULL DEFAULT 'MEETING',
    "status" "GovernanceCycleInstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "locationLabel" TEXT,
    "meetingUrl" TEXT,
    "decisionSummary" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceCycleInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceCycleInstanceDecision" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "decisionStatus" "GovernanceCycleItemDecisionStatus" NOT NULL,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceCycleInstanceDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceCycleInstanceAgendaItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GovernanceCycleInstanceAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernanceCycleInstance_clientId_idx" ON "GovernanceCycleInstance"("clientId");
CREATE INDEX "GovernanceCycleInstance_cycleId_idx" ON "GovernanceCycleInstance"("cycleId");
CREATE INDEX "GovernanceCycleInstance_clientId_cycleId_scheduledDecisionAt_idx" ON "GovernanceCycleInstance"("clientId", "cycleId", "scheduledDecisionAt");

-- CreateIndex
CREATE INDEX "GovernanceCycleInstanceDecision_clientId_idx" ON "GovernanceCycleInstanceDecision"("clientId");
CREATE INDEX "GovernanceCycleInstanceDecision_itemId_idx" ON "GovernanceCycleInstanceDecision"("itemId");

-- CreateIndex
CREATE INDEX "GovernanceCycleInstanceAgendaItem_clientId_idx" ON "GovernanceCycleInstanceAgendaItem"("clientId");
CREATE INDEX "GovernanceCycleInstanceAgendaItem_instanceId_idx" ON "GovernanceCycleInstanceAgendaItem"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceCycleInstanceDecision_instanceId_itemId_key" ON "GovernanceCycleInstanceDecision"("instanceId", "itemId");
CREATE UNIQUE INDEX "GovernanceCycleInstanceAgendaItem_instanceId_itemId_key" ON "GovernanceCycleInstanceAgendaItem"("instanceId", "itemId");

-- AddForeignKey
ALTER TABLE "GovernanceCycleInstance" ADD CONSTRAINT "GovernanceCycleInstance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstance" ADD CONSTRAINT "GovernanceCycleInstance_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "GovernanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstance" ADD CONSTRAINT "GovernanceCycleInstance_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleInstanceDecision" ADD CONSTRAINT "GovernanceCycleInstanceDecision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstanceDecision" ADD CONSTRAINT "GovernanceCycleInstanceDecision_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GovernanceCycleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstanceDecision" ADD CONSTRAINT "GovernanceCycleInstanceDecision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GovernanceCycleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstanceDecision" ADD CONSTRAINT "GovernanceCycleInstanceDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceCycleInstanceAgendaItem" ADD CONSTRAINT "GovernanceCycleInstanceAgendaItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstanceAgendaItem" ADD CONSTRAINT "GovernanceCycleInstanceAgendaItem_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GovernanceCycleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceCycleInstanceAgendaItem" ADD CONSTRAINT "GovernanceCycleInstanceAgendaItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GovernanceCycleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
