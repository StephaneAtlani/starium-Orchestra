-- RFC-PROJ-011 — Tâches, activités, jalons, base Gantt
-- Enums et tables nouvelles + backfill title/name, REACHED/ACHIEVED, dates

-- CreateEnum
CREATE TYPE "ProjectTaskDependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH');

-- CreateEnum
CREATE TYPE "ProjectActivityFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProjectActivityStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- AlterEnum ProjectTaskPriority
ALTER TYPE "ProjectTaskPriority" ADD VALUE 'CRITICAL';

-- AlterEnum ProjectTaskStatus (DRAFT en fin de type PostgreSQL)
ALTER TYPE "ProjectTaskStatus" ADD VALUE 'DRAFT';

-- ProjectMilestoneStatus : REACHED -> ACHIEVED
BEGIN;
CREATE TYPE "ProjectMilestoneStatus_new" AS ENUM ('PLANNED', 'ACHIEVED', 'DELAYED', 'CANCELLED');
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" TYPE "ProjectMilestoneStatus_new" USING (
  CASE "status"::text
    WHEN 'REACHED' THEN 'ACHIEVED'::"ProjectMilestoneStatus_new"
    WHEN 'PLANNED' THEN 'PLANNED'::"ProjectMilestoneStatus_new"
    WHEN 'DELAYED' THEN 'DELAYED'::"ProjectMilestoneStatus_new"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"ProjectMilestoneStatus_new"
    ELSE 'PLANNED'::"ProjectMilestoneStatus_new"
  END
);
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" SET DEFAULT 'PLANNED'::"ProjectMilestoneStatus_new";
DROP TYPE "ProjectMilestoneStatus";
ALTER TYPE "ProjectMilestoneStatus_new" RENAME TO "ProjectMilestoneStatus";
COMMIT;

-- FK à recréer après altération tables
ALTER TABLE "ProjectTask" DROP CONSTRAINT IF EXISTS "ProjectTask_assigneeUserId_fkey";
ALTER TABLE "ProjectTask" DROP CONSTRAINT IF EXISTS "ProjectTask_clientId_fkey";
ALTER TABLE "ProjectMilestone" DROP CONSTRAINT IF EXISTS "ProjectMilestone_clientId_fkey";

-- ProjectTask : nouvelles colonnes + backfill puis suppression anciennes
ALTER TABLE "ProjectTask" ADD COLUMN "name" TEXT;
UPDATE "ProjectTask" SET "name" = "title";
ALTER TABLE "ProjectTask" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "ProjectTask" ADD COLUMN "ownerUserId" TEXT;
UPDATE "ProjectTask" SET "ownerUserId" = "assigneeUserId";

ALTER TABLE "ProjectTask" ADD COLUMN "plannedStartDate" TIMESTAMP(3);
ALTER TABLE "ProjectTask" ADD COLUMN "plannedEndDate" TIMESTAMP(3);
UPDATE "ProjectTask" SET "plannedEndDate" = "dueDate";

ALTER TABLE "ProjectTask" ADD COLUMN "actualStartDate" TIMESTAMP(3);
ALTER TABLE "ProjectTask" ADD COLUMN "actualEndDate" TIMESTAMP(3);
UPDATE "ProjectTask" SET "actualEndDate" = "completedAt";

ALTER TABLE "ProjectTask" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
UPDATE "ProjectTask" SET "progress" = 100 WHERE "status" = 'DONE';

ALTER TABLE "ProjectTask" ADD COLUMN "parentTaskId" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "dependsOnTaskId" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "code" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "dependencyType" "ProjectTaskDependencyType";
ALTER TABLE "ProjectTask" ADD COLUMN "budgetLineId" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "updatedByUserId" TEXT;

ALTER TABLE "ProjectTask" DROP COLUMN "title";
ALTER TABLE "ProjectTask" DROP COLUMN "assigneeUserId";
ALTER TABLE "ProjectTask" DROP COLUMN "dueDate";
ALTER TABLE "ProjectTask" DROP COLUMN "completedAt";

ALTER TABLE "ProjectTask" ALTER COLUMN "status" SET DEFAULT 'TODO';
ALTER TABLE "ProjectTask" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

-- ProjectMilestone : renommage actualDate + colonnes RFC
ALTER TABLE "ProjectMilestone" RENAME COLUMN "actualDate" TO "achievedDate";

ALTER TABLE "ProjectMilestone" ADD COLUMN "code" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "description" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "linkedTaskId" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectMilestone" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "updatedByUserId" TEXT;
ALTER TABLE "ProjectMilestone" ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- CreateTable ProjectActivity
CREATE TABLE "ProjectActivity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectActivityStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "ProjectActivityFrequency" NOT NULL,
    "customRrule" TEXT,
    "nextExecutionDate" TIMESTAMP(3),
    "lastExecutionDate" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "budgetLineId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- Index ProjectTask
CREATE INDEX "ProjectTask_clientId_projectId_idx" ON "ProjectTask"("clientId", "projectId");
CREATE INDEX "ProjectTask_parentTaskId_idx" ON "ProjectTask"("parentTaskId");
CREATE INDEX "ProjectTask_dependsOnTaskId_idx" ON "ProjectTask"("dependsOnTaskId");
CREATE INDEX "ProjectTask_status_idx" ON "ProjectTask"("status");
CREATE INDEX "ProjectTask_priority_idx" ON "ProjectTask"("priority");
CREATE INDEX "ProjectTask_plannedStartDate_idx" ON "ProjectTask"("plannedStartDate");
CREATE INDEX "ProjectTask_plannedEndDate_idx" ON "ProjectTask"("plannedEndDate");

-- Index ProjectMilestone
CREATE INDEX "ProjectMilestone_linkedTaskId_idx" ON "ProjectMilestone"("linkedTaskId");
CREATE INDEX "ProjectMilestone_targetDate_idx" ON "ProjectMilestone"("targetDate");
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");

-- Index ProjectActivity
CREATE INDEX "ProjectActivity_clientId_idx" ON "ProjectActivity"("clientId");
CREATE INDEX "ProjectActivity_projectId_idx" ON "ProjectActivity"("projectId");
CREATE INDEX "ProjectActivity_sourceTaskId_idx" ON "ProjectActivity"("sourceTaskId");
CREATE INDEX "ProjectActivity_status_idx" ON "ProjectActivity"("status");
CREATE INDEX "ProjectActivity_nextExecutionDate_idx" ON "ProjectActivity"("nextExecutionDate");

-- Foreign keys ProjectTask
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys ProjectMilestone
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys ProjectActivity
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "ProjectTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
