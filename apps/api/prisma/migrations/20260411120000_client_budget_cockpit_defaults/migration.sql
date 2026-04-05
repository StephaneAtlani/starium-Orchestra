-- Préférence client : onglet pilotage budget par défaut (cockpit RFC-022 / fiche budget RFC-024).

CREATE TYPE "BudgetCockpitDefaultPilotageMode" AS ENUM (
  'DASHBOARD',
  'SYNTHESE',
  'PREVISIONNEL',
  'ATTERRISSAGE',
  'FORECAST'
);

ALTER TABLE "Client"
ADD COLUMN "budgetCockpitDefaultPilotageMode" "BudgetCockpitDefaultPilotageMode" NOT NULL DEFAULT 'SYNTHESE';
