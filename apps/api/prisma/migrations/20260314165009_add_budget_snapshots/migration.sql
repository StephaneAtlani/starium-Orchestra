-- CreateEnum
CREATE TYPE "BudgetSnapshotStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BudgetSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "status" "BudgetSnapshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "budgetName" TEXT NOT NULL,
    "budgetCode" TEXT,
    "budgetCurrency" TEXT NOT NULL,
    "budgetStatus" "BudgetStatus" NOT NULL,
    "totalInitialAmount" DECIMAL(18,2) NOT NULL,
    "totalRevisedAmount" DECIMAL(18,2) NOT NULL,
    "totalForecastAmount" DECIMAL(18,2) NOT NULL,
    "totalCommittedAmount" DECIMAL(18,2) NOT NULL,
    "totalConsumedAmount" DECIMAL(18,2) NOT NULL,
    "totalRemainingAmount" DECIMAL(18,2) NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetSnapshotLine" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "envelopeName" TEXT,
    "envelopeCode" TEXT,
    "envelopeType" "BudgetEnvelopeType",
    "lineCode" TEXT NOT NULL,
    "lineName" TEXT NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "currency" TEXT NOT NULL,
    "lineStatus" "BudgetLineStatus" NOT NULL,
    "initialAmount" DECIMAL(18,2) NOT NULL,
    "revisedAmount" DECIMAL(18,2) NOT NULL,
    "forecastAmount" DECIMAL(18,2) NOT NULL,
    "committedAmount" DECIMAL(18,2) NOT NULL,
    "consumedAmount" DECIMAL(18,2) NOT NULL,
    "remainingAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetSnapshotLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetSnapshot_clientId_idx" ON "BudgetSnapshot"("clientId");

-- CreateIndex
CREATE INDEX "BudgetSnapshot_budgetId_idx" ON "BudgetSnapshot"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetSnapshot_exerciseId_idx" ON "BudgetSnapshot"("exerciseId");

-- CreateIndex
CREATE INDEX "BudgetSnapshot_snapshotDate_idx" ON "BudgetSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "BudgetSnapshot_clientId_budgetId_idx" ON "BudgetSnapshot"("clientId", "budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetSnapshot_clientId_code_key" ON "BudgetSnapshot"("clientId", "code");

-- CreateIndex
CREATE INDEX "BudgetSnapshotLine_snapshotId_idx" ON "BudgetSnapshotLine"("snapshotId");

-- CreateIndex
CREATE INDEX "BudgetSnapshotLine_clientId_idx" ON "BudgetSnapshotLine"("clientId");

-- CreateIndex
CREATE INDEX "BudgetSnapshotLine_budgetLineId_idx" ON "BudgetSnapshotLine"("budgetLineId");

-- CreateIndex
CREATE INDEX "BudgetSnapshotLine_budgetId_idx" ON "BudgetSnapshotLine"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetSnapshotLine_envelopeId_idx" ON "BudgetSnapshotLine"("envelopeId");

-- AddForeignKey
ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BudgetExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSnapshotLine" ADD CONSTRAINT "BudgetSnapshotLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BudgetSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
