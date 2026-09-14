-- RFC-STRAT-011 — documents schéma directeur + notes de revue
ALTER TABLE "StrategicDirectionStrategy"
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewInstanceLabel" TEXT;

CREATE TABLE IF NOT EXISTS "StrategicDirectionStrategyDocument" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalFilename" TEXT,
  "mimeType" TEXT,
  "extension" TEXT,
  "sizeBytes" INTEGER,
  "status" "ProjectDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
  "storageType" "ProjectDocumentStorageType" NOT NULL DEFAULT 'STARIUM',
  "storageBucket" TEXT,
  "storageKey" TEXT,
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "StrategicDirectionStrategyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyDocument_clientId_idx"
  ON "StrategicDirectionStrategyDocument"("clientId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyDocument_strategyId_idx"
  ON "StrategicDirectionStrategyDocument"("strategyId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyDocument_clientId_strategyId_idx"
  ON "StrategicDirectionStrategyDocument"("clientId", "strategyId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyDocument_clientId_status_idx"
  ON "StrategicDirectionStrategyDocument"("clientId", "status");

ALTER TABLE "StrategicDirectionStrategyDocument"
  DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategyDocument_clientId_fkey";
ALTER TABLE "StrategicDirectionStrategyDocument"
  ADD CONSTRAINT "StrategicDirectionStrategyDocument_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicDirectionStrategyDocument"
  DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategyDocument_strategyId_fkey";
ALTER TABLE "StrategicDirectionStrategyDocument"
  ADD CONSTRAINT "StrategicDirectionStrategyDocument_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicDirectionStrategyDocument"
  DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategyDocument_uploadedByUserId_fkey";
ALTER TABLE "StrategicDirectionStrategyDocument"
  ADD CONSTRAINT "StrategicDirectionStrategyDocument_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
