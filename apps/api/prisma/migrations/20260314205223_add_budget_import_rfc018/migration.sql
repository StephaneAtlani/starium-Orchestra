-- CreateEnum
CREATE TYPE "BudgetImportSourceType" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "BudgetImportEntityType" AS ENUM ('BUDGET_LINES');

-- CreateEnum
CREATE TYPE "BudgetImportTargetEntityType" AS ENUM ('BUDGET_LINE');

-- CreateEnum
CREATE TYPE "BudgetImportJobStatus" AS ENUM ('ANALYZED', 'PREVIEWED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BudgetImportMode" AS ENUM ('CREATE_ONLY', 'UPSERT', 'UPDATE_ONLY');

-- CreateTable
CREATE TABLE "BudgetImportMapping" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "BudgetImportSourceType" NOT NULL,
    "entityType" "BudgetImportEntityType" NOT NULL DEFAULT 'BUDGET_LINES',
    "sheetName" TEXT,
    "headerRowIndex" INTEGER NOT NULL DEFAULT 1,
    "mappingConfig" JSONB NOT NULL,
    "optionsConfig" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetImportJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "mappingId" TEXT,
    "fileName" TEXT NOT NULL,
    "sourceType" "BudgetImportSourceType" NOT NULL,
    "status" "BudgetImportJobStatus" NOT NULL,
    "importMode" "BudgetImportMode" NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetImportRowLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "targetEntityType" "BudgetImportTargetEntityType" NOT NULL DEFAULT 'BUDGET_LINE',
    "targetEntityId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER,
    "externalId" TEXT,
    "compositeHash" TEXT,
    "fingerprintData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetImportRowLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetImportMapping_clientId_idx" ON "BudgetImportMapping"("clientId");

-- CreateIndex
CREATE INDEX "BudgetImportJob_clientId_budgetId_idx" ON "BudgetImportJob"("clientId", "budgetId");

-- CreateIndex
CREATE INDEX "BudgetImportJob_mappingId_idx" ON "BudgetImportJob"("mappingId");

-- CreateIndex
CREATE INDEX "BudgetImportRowLink_clientId_budgetId_targetEntityType_targ_idx" ON "BudgetImportRowLink"("clientId", "budgetId", "targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "BudgetImportRowLink_clientId_budgetId_externalId_idx" ON "BudgetImportRowLink"("clientId", "budgetId", "externalId");

-- CreateIndex
CREATE INDEX "BudgetImportRowLink_clientId_budgetId_compositeHash_idx" ON "BudgetImportRowLink"("clientId", "budgetId", "compositeHash");

-- AddForeignKey
ALTER TABLE "BudgetImportMapping" ADD CONSTRAINT "BudgetImportMapping_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportMapping" ADD CONSTRAINT "BudgetImportMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportJob" ADD CONSTRAINT "BudgetImportJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportJob" ADD CONSTRAINT "BudgetImportJob_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportJob" ADD CONSTRAINT "BudgetImportJob_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "BudgetImportMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportJob" ADD CONSTRAINT "BudgetImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportRowLink" ADD CONSTRAINT "BudgetImportRowLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetImportRowLink" ADD CONSTRAINT "BudgetImportRowLink_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "BudgetImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
