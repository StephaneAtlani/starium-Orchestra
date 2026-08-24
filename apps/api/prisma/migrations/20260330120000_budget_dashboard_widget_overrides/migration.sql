-- MVP per-user cockpit budget widget overrides (RFC-022 override sparse).
--
-- IMPORTANT : la FK vers "BudgetDashboardWidget" est volontairement absente ici.
-- Cette table n’existe qu’à partir de 20260331193000_rfc022_budget_dashboard_config.
-- La FK widgetId y est ajoutée (idempotente).

CREATE TABLE IF NOT EXISTS "BudgetDashboardWidgetOverride" (
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

DO $$ BEGIN
  ALTER TABLE "BudgetDashboardWidgetOverride"
    ADD CONSTRAINT "BudgetDashboardWidgetOverride_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetDashboardWidgetOverride"
    ADD CONSTRAINT "BudgetDashboardWidgetOverride_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "BudgetDashboardWidgetOverride_clientId_userId_widgetId_key"
  ON "BudgetDashboardWidgetOverride"("clientId", "userId", "widgetId");

CREATE INDEX IF NOT EXISTS "BudgetDashboardWidgetOverride_clientId_idx"
  ON "BudgetDashboardWidgetOverride"("clientId");

CREATE INDEX IF NOT EXISTS "BudgetDashboardWidgetOverride_userId_idx"
  ON "BudgetDashboardWidgetOverride"("userId");

CREATE INDEX IF NOT EXISTS "BudgetDashboardWidgetOverride_widgetId_idx"
  ON "BudgetDashboardWidgetOverride"("widgetId");
