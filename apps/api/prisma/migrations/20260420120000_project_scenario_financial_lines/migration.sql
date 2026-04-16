-- RFC-PROJ-SC-002: project scenario financial lines
CREATE TABLE "ProjectScenarioFinancialLine" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "projectBudgetLinkId" TEXT,
    "budgetLineId" TEXT,
    "label" TEXT NOT NULL,
    "costCategory" TEXT,
    "amountPlanned" DECIMAL(18,2) NOT NULL,
    "amountForecast" DECIMAL(18,2),
    "amountActual" DECIMAL(18,2),
    "currencyCode" VARCHAR(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenarioFinancialLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectScenarioFinancialLine_clientId_scenarioId_idx"
ON "ProjectScenarioFinancialLine"("clientId", "scenarioId");

CREATE INDEX "ProjectScenarioFinancialLine_clientId_budgetLineId_idx"
ON "ProjectScenarioFinancialLine"("clientId", "budgetLineId");

CREATE INDEX "ProjectScenarioFinancialLine_clientId_projectBudgetLinkId_idx"
ON "ProjectScenarioFinancialLine"("clientId", "projectBudgetLinkId");

ALTER TABLE "ProjectScenarioFinancialLine"
ADD CONSTRAINT "ProjectScenarioFinancialLine_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioFinancialLine"
ADD CONSTRAINT "ProjectScenarioFinancialLine_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "ProjectScenario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioFinancialLine"
ADD CONSTRAINT "ProjectScenarioFinancialLine_projectBudgetLinkId_fkey"
FOREIGN KEY ("projectBudgetLinkId") REFERENCES "ProjectBudgetLink"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioFinancialLine"
ADD CONSTRAINT "ProjectScenarioFinancialLine_budgetLineId_fkey"
FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
