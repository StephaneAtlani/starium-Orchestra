-- Étiquettes Planner / Starium (tâches + jalons) + colonne useMicrosoftPlannerLabels.
-- Idempotent : sûr si une base a déjà appliqué une variante partielle de 20260327120000
-- ou si les objets existent déjà.

-- AddColumn
ALTER TABLE "ProjectMicrosoftLink" ADD COLUMN IF NOT EXISTS "useMicrosoftPlannerLabels" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectTaskLabel" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannerCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskLabel_clientId_projectId_name_key" ON "ProjectTaskLabel"("clientId", "projectId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabel_clientId_idx" ON "ProjectTaskLabel"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabel_projectId_idx" ON "ProjectTaskLabel"("projectId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabel" ADD CONSTRAINT "ProjectTaskLabel_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabel" ADD CONSTRAINT "ProjectTaskLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectTaskLabelAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectTaskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskLabelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskLabelAssignment_clientId_projectTaskId_labelId_key" ON "ProjectTaskLabelAssignment"("clientId", "projectTaskId", "labelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabelAssignment_clientId_idx" ON "ProjectTaskLabelAssignment"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabelAssignment_projectId_idx" ON "ProjectTaskLabelAssignment"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabelAssignment_projectTaskId_idx" ON "ProjectTaskLabelAssignment"("projectTaskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTaskLabelAssignment_labelId_idx" ON "ProjectTaskLabelAssignment"("labelId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabelAssignment" ADD CONSTRAINT "ProjectTaskLabelAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabelAssignment" ADD CONSTRAINT "ProjectTaskLabelAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabelAssignment" ADD CONSTRAINT "ProjectTaskLabelAssignment_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectTaskLabelAssignment" ADD CONSTRAINT "ProjectTaskLabelAssignment_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "ProjectTaskLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectMilestoneLabel" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestoneLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMilestoneLabel_clientId_projectId_name_key" ON "ProjectMilestoneLabel"("clientId", "projectId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabel_clientId_idx" ON "ProjectMilestoneLabel"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabel_projectId_idx" ON "ProjectMilestoneLabel"("projectId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabel" ADD CONSTRAINT "ProjectMilestoneLabel_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabel" ADD CONSTRAINT "ProjectMilestoneLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectMilestoneLabelAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectMilestoneId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestoneLabelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMilestoneLabelAssignment_clientId_projectMilestoneId_labelId_key" ON "ProjectMilestoneLabelAssignment"("clientId", "projectMilestoneId", "labelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabelAssignment_clientId_idx" ON "ProjectMilestoneLabelAssignment"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabelAssignment_projectId_idx" ON "ProjectMilestoneLabelAssignment"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabelAssignment_projectMilestoneId_idx" ON "ProjectMilestoneLabelAssignment"("projectMilestoneId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMilestoneLabelAssignment_labelId_idx" ON "ProjectMilestoneLabelAssignment"("labelId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabelAssignment" ADD CONSTRAINT "ProjectMilestoneLabelAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabelAssignment" ADD CONSTRAINT "ProjectMilestoneLabelAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabelAssignment" ADD CONSTRAINT "ProjectMilestoneLabelAssignment_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneLabelAssignment" ADD CONSTRAINT "ProjectMilestoneLabelAssignment_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "ProjectMilestoneLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
