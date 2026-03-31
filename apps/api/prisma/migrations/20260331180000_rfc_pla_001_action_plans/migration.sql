-- RFC-PLA-001 — ActionPlan + ProjectTask optionnel projet / liens plan & risque

-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionPlanPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "ActionPlanStatus" NOT NULL,
    "priority" "ActionPlanPriority" NOT NULL,
    "ownerUserId" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_clientId_code_key" ON "ActionPlan"("clientId", "code");

CREATE INDEX "ActionPlan_clientId_idx" ON "ActionPlan"("clientId");

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ProjectTask: projet supprimé => projectId null (plus cascade sur la tâche)
ALTER TABLE "ProjectTask" DROP CONSTRAINT "ProjectTask_projectId_fkey";

ALTER TABLE "ProjectTask" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "ProjectTask" ADD COLUMN "actionPlanId" TEXT,
ADD COLUMN "riskId" TEXT;

ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "ProjectRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectTask_clientId_actionPlanId_idx" ON "ProjectTask"("clientId", "actionPlanId");

CREATE INDEX "ProjectTask_clientId_riskId_idx" ON "ProjectTask"("clientId", "riskId");

CREATE INDEX "ProjectTask_actionPlanId_idx" ON "ProjectTask"("actionPlanId");

CREATE INDEX "ProjectTask_riskId_idx" ON "ProjectTask"("riskId");
