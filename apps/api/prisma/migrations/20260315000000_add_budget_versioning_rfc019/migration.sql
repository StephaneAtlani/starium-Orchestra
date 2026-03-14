-- CreateEnum
CREATE TYPE "BudgetVersionKind" AS ENUM ('BASELINE', 'REVISION');

-- CreateEnum
CREATE TYPE "BudgetVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BudgetVersionSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baselineBudgetId" TEXT,
    "activeBudgetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetVersionSet_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "versionSetId" TEXT,
ADD COLUMN "versionNumber" INTEGER,
ADD COLUMN "versionLabel" TEXT,
ADD COLUMN "versionKind" "BudgetVersionKind",
ADD COLUMN "versionStatus" "BudgetVersionStatus",
ADD COLUMN "parentBudgetId" TEXT,
ADD COLUMN "activatedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "isVersioned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "BudgetVersionSet_clientId_code_key" ON "BudgetVersionSet"("clientId", "code");

-- CreateIndex
CREATE INDEX "BudgetVersionSet_clientId_idx" ON "BudgetVersionSet"("clientId");

-- CreateIndex
CREATE INDEX "BudgetVersionSet_exerciseId_idx" ON "BudgetVersionSet"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetVersionSet_baselineBudgetId_key" ON "BudgetVersionSet"("baselineBudgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetVersionSet_activeBudgetId_key" ON "BudgetVersionSet"("activeBudgetId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_versionSetId_versionNumber_key" ON "Budget"("versionSetId", "versionNumber");

-- CreateIndex
CREATE INDEX "Budget_clientId_versionSetId_idx" ON "Budget"("clientId", "versionSetId");

-- CreateIndex
CREATE INDEX "Budget_clientId_versionStatus_idx" ON "Budget"("clientId", "versionStatus");

-- CreateIndex
CREATE INDEX "Budget_clientId_versionKind_idx" ON "Budget"("clientId", "versionKind");

-- AddForeignKey
ALTER TABLE "BudgetVersionSet" ADD CONSTRAINT "BudgetVersionSet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetVersionSet" ADD CONSTRAINT "BudgetVersionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BudgetExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetVersionSet" ADD CONSTRAINT "BudgetVersionSet_baselineBudgetId_fkey" FOREIGN KEY ("baselineBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetVersionSet" ADD CONSTRAINT "BudgetVersionSet_activeBudgetId_fkey" FOREIGN KEY ("activeBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_versionSetId_fkey" FOREIGN KEY ("versionSetId") REFERENCES "BudgetVersionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_parentBudgetId_fkey" FOREIGN KEY ("parentBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
