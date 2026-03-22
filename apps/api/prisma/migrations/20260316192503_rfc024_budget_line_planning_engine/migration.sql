-- CreateEnum
CREATE TYPE "BudgetLinePlanningMode" AS ENUM ('MANUAL', 'ANNUAL_SPREAD', 'QUARTERLY_SPREAD', 'ONE_SHOT', 'GROWTH', 'CALCULATED');

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "planningMode" "BudgetLinePlanningMode",
ADD COLUMN     "planningTotalAmount" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "BudgetLinePlanningMonth" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLinePlanningMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLinePlanningScenario" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "mode" "BudgetLinePlanningMode" NOT NULL,
    "inputJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLinePlanningScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetLinePlanningMonth_clientId_budgetLineId_idx" ON "BudgetLinePlanningMonth"("clientId", "budgetLineId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLinePlanningMonth_budgetLineId_monthIndex_key" ON "BudgetLinePlanningMonth"("budgetLineId", "monthIndex");

-- CreateIndex
CREATE INDEX "BudgetLinePlanningScenario_clientId_budgetLineId_createdAt_idx" ON "BudgetLinePlanningScenario"("clientId", "budgetLineId", "createdAt");

-- AddForeignKey
ALTER TABLE "BudgetLinePlanningMonth" ADD CONSTRAINT "BudgetLinePlanningMonth_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLinePlanningMonth" ADD CONSTRAINT "BudgetLinePlanningMonth_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLinePlanningScenario" ADD CONSTRAINT "BudgetLinePlanningScenario_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLinePlanningScenario" ADD CONSTRAINT "BudgetLinePlanningScenario_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
