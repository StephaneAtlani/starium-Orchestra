-- Corrige l'index unique global recréé par 20260507100200 qui bloque les snapshots ARCHIVED
-- (même client + direction + vision) lors d'une adaptation de stratégie APPROVED.

DROP INDEX IF EXISTS "StrategicDirectionStrategy_clientId_directionId_alignedVisionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategy_active_direction_vision_key"
ON "StrategicDirectionStrategy" ("clientId", "directionId", "alignedVisionId")
WHERE ("archivedAt" IS NULL);
