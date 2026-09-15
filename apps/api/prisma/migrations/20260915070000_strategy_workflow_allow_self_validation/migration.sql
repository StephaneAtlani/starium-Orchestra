-- RFC-STRAT-011 : option circuit — autoriser l'auto-validation du soumissionnaire
ALTER TABLE "StrategicDirectionStrategyWorkflowSettings"
  ADD COLUMN IF NOT EXISTS "allowSelfValidation" BOOLEAN NOT NULL DEFAULT false;
