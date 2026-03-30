-- MVP per-user cockpit budget widget overrides (RFC-022 override sparse).

CREATE TABLE "BudgetDashboardWidgetOverride" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "isActive" BOOLEAN,
    "position" INTEGER,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetDashboardWidgetOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BudgetDashboardWidgetOverride" ADD CONSTRAINT "BudgetDashboardWidgetOverride_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetDashboardWidgetOverride" ADD CONSTRAINT "BudgetDashboardWidgetOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetDashboardWidgetOverride" ADD CONSTRAINT "BudgetDashboardWidgetOverride_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "BudgetDashboardWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "BudgetDashboardWidgetOverride_clientId_userId_widgetId_key" ON "BudgetDashboardWidgetOverride"("clientId", "userId", "widgetId");

CREATE INDEX "BudgetDashboardWidgetOverride_clientId_idx" ON "BudgetDashboardWidgetOverride"("clientId");
CREATE INDEX "BudgetDashboardWidgetOverride_userId_idx" ON "BudgetDashboardWidgetOverride"("userId");
CREATE INDEX "BudgetDashboardWidgetOverride_widgetId_idx" ON "BudgetDashboardWidgetOverride"("widgetId");

