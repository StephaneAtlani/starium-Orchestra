-- CreateEnum
CREATE TYPE "BudgetLineAllocationScope" AS ENUM ('ENTERPRISE', 'ANALYTICAL');

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "allocationScope" "BudgetLineAllocationScope" NOT NULL DEFAULT 'ENTERPRISE',
ADD COLUMN     "analyticalLedgerAccountId" TEXT,
ADD COLUMN     "generalLedgerAccountId" TEXT;

-- CreateTable
CREATE TABLE "GeneralLedgerAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralLedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticalLedgerAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticalLedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLineCostCenterSplit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLineCostCenterSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneralLedgerAccount_clientId_isActive_idx" ON "GeneralLedgerAccount"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralLedgerAccount_clientId_code_key" ON "GeneralLedgerAccount"("clientId", "code");

-- CreateIndex
CREATE INDEX "AnalyticalLedgerAccount_clientId_isActive_idx" ON "AnalyticalLedgerAccount"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticalLedgerAccount_clientId_code_key" ON "AnalyticalLedgerAccount"("clientId", "code");

-- CreateIndex
CREATE INDEX "CostCenter_clientId_isActive_idx" ON "CostCenter"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_clientId_code_key" ON "CostCenter"("clientId", "code");

-- CreateIndex
CREATE INDEX "BudgetLineCostCenterSplit_budgetLineId_idx" ON "BudgetLineCostCenterSplit"("budgetLineId");

-- CreateIndex
CREATE INDEX "BudgetLineCostCenterSplit_clientId_budgetLineId_idx" ON "BudgetLineCostCenterSplit"("clientId", "budgetLineId");

-- CreateIndex
CREATE INDEX "BudgetLineCostCenterSplit_clientId_costCenterId_idx" ON "BudgetLineCostCenterSplit"("clientId", "costCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLineCostCenterSplit_budgetLineId_costCenterId_key" ON "BudgetLineCostCenterSplit"("budgetLineId", "costCenterId");

-- AddForeignKey
ALTER TABLE "GeneralLedgerAccount" ADD CONSTRAINT "GeneralLedgerAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticalLedgerAccount" ADD CONSTRAINT "AnalyticalLedgerAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_generalLedgerAccountId_fkey" FOREIGN KEY ("generalLedgerAccountId") REFERENCES "GeneralLedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_analyticalLedgerAccountId_fkey" FOREIGN KEY ("analyticalLedgerAccountId") REFERENCES "AnalyticalLedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineCostCenterSplit" ADD CONSTRAINT "BudgetLineCostCenterSplit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineCostCenterSplit" ADD CONSTRAINT "BudgetLineCostCenterSplit_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineCostCenterSplit" ADD CONSTRAINT "BudgetLineCostCenterSplit_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
