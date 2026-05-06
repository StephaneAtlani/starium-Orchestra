-- RFC-STRAT-007 — Vision stratégique V1 — Migration 2/2 : colonnes + backfill + index.
-- Les valeurs d'enum utilisées ici (notamment celles ajoutées en migration 1)
-- sont déjà committées : on peut les consommer en UPDATE.

-- StrategicVision : statut (compat additive avec isActive)
ALTER TABLE "StrategicVision"
  ADD COLUMN "status" "StrategicVisionStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "StrategicVision"
SET "status" = CASE WHEN "isActive" = TRUE THEN 'ACTIVE'::"StrategicVisionStatus" ELSE 'DRAFT'::"StrategicVisionStatus" END;

CREATE INDEX "StrategicVision_clientId_status_idx" ON "StrategicVision"("clientId", "status");

-- StrategicAxis : statut + code + sortOrder
ALTER TABLE "StrategicAxis"
  ADD COLUMN "status" "StrategicAxisStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "code" TEXT,
  ADD COLUMN "sortOrder" INTEGER;

CREATE INDEX "StrategicAxis_clientId_status_idx" ON "StrategicAxis"("clientId", "status");

-- StrategicObjective : lifecycleStatus + healthStatus + progressPercent + targetDate + ownerUserId
ALTER TABLE "StrategicObjective"
  ADD COLUMN "lifecycleStatus" "StrategicObjectiveLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "healthStatus" "StrategicObjectiveHealthStatus",
  ADD COLUMN "progressPercent" INTEGER,
  ADD COLUMN "targetDate" TIMESTAMP(3),
  ADD COLUMN "ownerUserId" TEXT,
  ADD CONSTRAINT "StrategicObjective_progressPercent_check" CHECK ("progressPercent" IS NULL OR ("progressPercent" >= 0 AND "progressPercent" <= 100));

-- Backfill StrategicObjective : split status legacy → lifecycleStatus + healthStatus
UPDATE "StrategicObjective"
SET "lifecycleStatus" = 'COMPLETED'::"StrategicObjectiveLifecycleStatus",
    "healthStatus" = NULL
WHERE "status" = 'COMPLETED';

UPDATE "StrategicObjective"
SET "lifecycleStatus" = 'ARCHIVED'::"StrategicObjectiveLifecycleStatus",
    "healthStatus" = NULL
WHERE "status" = 'ARCHIVED';

UPDATE "StrategicObjective"
SET "lifecycleStatus" = 'ACTIVE'::"StrategicObjectiveLifecycleStatus",
    "healthStatus" = 'ON_TRACK'::"StrategicObjectiveHealthStatus"
WHERE "status" = 'ON_TRACK';

UPDATE "StrategicObjective"
SET "lifecycleStatus" = 'ACTIVE'::"StrategicObjectiveLifecycleStatus",
    "healthStatus" = 'AT_RISK'::"StrategicObjectiveHealthStatus"
WHERE "status" = 'AT_RISK';

UPDATE "StrategicObjective"
SET "lifecycleStatus" = 'ACTIVE'::"StrategicObjectiveLifecycleStatus",
    "healthStatus" = 'OFF_TRACK'::"StrategicObjectiveHealthStatus"
WHERE "status" = 'OFF_TRACK';

UPDATE "StrategicObjective"
SET "targetDate" = "deadline"
WHERE "deadline" IS NOT NULL;

ALTER TABLE "StrategicObjective"
  ADD CONSTRAINT "StrategicObjective_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StrategicObjective_clientId_lifecycleStatus_idx" ON "StrategicObjective"("clientId", "lifecycleStatus");
CREATE INDEX "StrategicObjective_clientId_targetDate_idx" ON "StrategicObjective"("clientId", "targetDate");
CREATE INDEX "StrategicObjective_clientId_ownerUserId_idx" ON "StrategicObjective"("clientId", "ownerUserId");

-- StrategicLink : alignmentScore + comment + updatedAt
ALTER TABLE "StrategicLink"
  ADD COLUMN "alignmentScore" INTEGER,
  ADD COLUMN "comment" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "StrategicLink_alignmentScore_check" CHECK ("alignmentScore" IS NULL OR ("alignmentScore" >= 0 AND "alignmentScore" <= 100));

UPDATE "StrategicLink" SET "updatedAt" = "createdAt";
