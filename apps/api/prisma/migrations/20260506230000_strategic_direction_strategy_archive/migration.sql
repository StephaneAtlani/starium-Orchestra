-- Statut ARCHIVED + date d'archivage ; une stratégie archivée ne compte plus pour l'unicité (nouveau cycle pour la même tripletta client/direction/vision).

ALTER TYPE "StrategicDirectionStrategyStatus" ADD VALUE 'ARCHIVED';

ALTER TABLE "StrategicDirectionStrategy"
ADD COLUMN IF NOT EXISTS "archivedReason" TEXT,
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Ancienne contrainte Prisma (nom canonique @@unique sur la tripletta).
ALTER TABLE "StrategicDirectionStrategy"
DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategy_clientId_directionId_alignedVisionId_key";

CREATE UNIQUE INDEX "StrategicDirectionStrategy_active_direction_vision_key"
ON "StrategicDirectionStrategy" ("clientId", "directionId", "alignedVisionId")
WHERE ("archivedAt" IS NULL);
