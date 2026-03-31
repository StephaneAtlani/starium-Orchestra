-- RFC-022 : cockpit budgétaire configurable (config + widgets).

CREATE TYPE "BudgetDashboardWidgetType" AS ENUM ('KPI', 'ALERT_LIST', 'ENVELOPE_LIST', 'LINE_LIST', 'CHART');

CREATE TYPE "BudgetDashboardChartType" AS ENUM ('RUN_BUILD_BREAKDOWN', 'CONSUMPTION_TREND');

CREATE TABLE "BudgetDashboardConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultExerciseId" TEXT,
    "defaultBudgetId" TEXT,
    "layoutConfig" JSONB NOT NULL DEFAULT '{}',
    "filtersConfig" JSONB,
    "thresholdsConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetDashboardConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BudgetDashboardWidget" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "type" "BudgetDashboardWidgetType" NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'full',
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetDashboardWidget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BudgetDashboardConfig" ADD CONSTRAINT "BudgetDashboardConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetDashboardConfig" ADD CONSTRAINT "BudgetDashboardConfig_defaultExerciseId_fkey" FOREIGN KEY ("defaultExerciseId") REFERENCES "BudgetExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BudgetDashboardConfig" ADD CONSTRAINT "BudgetDashboardConfig_defaultBudgetId_fkey" FOREIGN KEY ("defaultBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BudgetDashboardWidget" ADD CONSTRAINT "BudgetDashboardWidget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetDashboardWidget" ADD CONSTRAINT "BudgetDashboardWidget_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BudgetDashboardConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "BudgetDashboardConfig_clientId_idx" ON "BudgetDashboardConfig"("clientId");

CREATE UNIQUE INDEX "BudgetDashboardWidget_configId_position_key" ON "BudgetDashboardWidget"("configId", "position");

CREATE INDEX "BudgetDashboardWidget_clientId_idx" ON "BudgetDashboardWidget"("clientId");

CREATE INDEX "BudgetDashboardWidget_clientId_configId_idx" ON "BudgetDashboardWidget"("clientId", "configId");

CREATE UNIQUE INDEX "BudgetDashboardConfig_one_default_per_client" ON "BudgetDashboardConfig"("clientId") WHERE "isDefault" = true;
