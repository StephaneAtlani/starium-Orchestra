-- RFC-PROJ-CYCLE-003-E — BudgetGovernanceDecision

CREATE TABLE "BudgetGovernanceDecision" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "decisionStatus" "GovernanceCycleItemDecisionStatus" NOT NULL,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetGovernanceDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetGovernanceDecision_decisionId_key" ON "BudgetGovernanceDecision"("decisionId");
CREATE INDEX "BudgetGovernanceDecision_clientId_budgetId_decidedAt_idx" ON "BudgetGovernanceDecision"("clientId", "budgetId", "decidedAt");
CREATE INDEX "BudgetGovernanceDecision_instanceId_idx" ON "BudgetGovernanceDecision"("instanceId");
CREATE INDEX "BudgetGovernanceDecision_itemId_idx" ON "BudgetGovernanceDecision"("itemId");

ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GovernanceCycleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GovernanceCycleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GovernanceCycleInstanceDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGovernanceDecision" ADD CONSTRAINT "BudgetGovernanceDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
