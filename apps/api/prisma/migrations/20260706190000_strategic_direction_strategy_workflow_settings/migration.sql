-- RFC stratégie de direction — options workflow validation (validateur désigné)

ALTER TABLE "StrategicDirectionStrategy"
  ADD COLUMN "validatorUserId" TEXT;

CREATE INDEX "StrategicDirectionStrategy_validatorUserId_idx"
  ON "StrategicDirectionStrategy"("validatorUserId");

ALTER TABLE "StrategicDirectionStrategy"
  ADD CONSTRAINT "StrategicDirectionStrategy_validatorUserId_fkey"
  FOREIGN KEY ("validatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StrategicDirectionStrategyWorkflowSettings" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "allowSubmitterToSelectValidator" BOOLEAN NOT NULL DEFAULT true,
  "authorizedValidatorUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "authorizedValidatorRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "defaultValidatorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StrategicDirectionStrategyWorkflowSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrategicDirectionStrategyWorkflowSettings_clientId_key"
  ON "StrategicDirectionStrategyWorkflowSettings"("clientId");

CREATE INDEX "StrategicDirectionStrategyWorkflowSettings_clientId_idx"
  ON "StrategicDirectionStrategyWorkflowSettings"("clientId");

CREATE INDEX "StrategicDirectionStrategyWorkflowSettings_defaultValidatorUserId_idx"
  ON "StrategicDirectionStrategyWorkflowSettings"("defaultValidatorUserId");

ALTER TABLE "StrategicDirectionStrategyWorkflowSettings"
  ADD CONSTRAINT "StrategicDirectionStrategyWorkflowSettings_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicDirectionStrategyWorkflowSettings"
  ADD CONSTRAINT "StrategicDirectionStrategyWorkflowSettings_defaultValidatorUserId_fkey"
  FOREIGN KEY ("defaultValidatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
