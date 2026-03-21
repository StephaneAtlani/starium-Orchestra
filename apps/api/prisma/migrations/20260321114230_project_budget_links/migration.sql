-- CreateEnum
CREATE TYPE "ProjectBudgetAllocationType" AS ENUM ('FULL', 'PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "ProjectBudgetLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "allocationType" "ProjectBudgetAllocationType" NOT NULL,
    "percentage" DECIMAL(5,2),
    "amount" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBudgetLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectBudgetLink_clientId_idx" ON "ProjectBudgetLink"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBudgetLink_projectId_budgetLineId_key" ON "ProjectBudgetLink"("projectId", "budgetLineId");

-- AddForeignKey
ALTER TABLE "ProjectBudgetLink" ADD CONSTRAINT "ProjectBudgetLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLink" ADD CONSTRAINT "ProjectBudgetLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLink" ADD CONSTRAINT "ProjectBudgetLink_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
