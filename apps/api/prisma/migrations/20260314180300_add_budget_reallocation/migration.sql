-- CreateTable
CREATE TABLE "BudgetReallocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "sourceLineId" TEXT NOT NULL,
    "targetLineId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetReallocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetReallocation_clientId_idx" ON "BudgetReallocation"("clientId");

-- CreateIndex
CREATE INDEX "BudgetReallocation_budgetId_idx" ON "BudgetReallocation"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetReallocation_sourceLineId_idx" ON "BudgetReallocation"("sourceLineId");

-- CreateIndex
CREATE INDEX "BudgetReallocation_targetLineId_idx" ON "BudgetReallocation"("targetLineId");

-- CreateIndex
CREATE INDEX "BudgetReallocation_createdAt_idx" ON "BudgetReallocation"("createdAt");

-- AddForeignKey
ALTER TABLE "BudgetReallocation" ADD CONSTRAINT "BudgetReallocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetReallocation" ADD CONSTRAINT "BudgetReallocation_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetReallocation" ADD CONSTRAINT "BudgetReallocation_sourceLineId_fkey" FOREIGN KEY ("sourceLineId") REFERENCES "BudgetLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetReallocation" ADD CONSTRAINT "BudgetReallocation_targetLineId_fkey" FOREIGN KEY ("targetLineId") REFERENCES "BudgetLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetReallocation" ADD CONSTRAINT "BudgetReallocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
