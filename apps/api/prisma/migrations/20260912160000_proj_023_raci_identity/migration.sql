-- RFC-PROJ-023 P0bis — RASCI colonnes personnes (identityKey)

ALTER TABLE "ProjectRaciCell" ADD COLUMN IF NOT EXISTS "identityKey" VARCHAR(150);
ALTER TABLE "ProjectRaciCell" ALTER COLUMN "roleId" DROP NOT NULL;

-- Drop old unique BEFORE expanding (several members share same roleId).
-- Prisma created a UNIQUE INDEX, not a table CONSTRAINT.
DROP INDEX IF EXISTS "ProjectRaciCell_projectId_actionId_roleId_key";

-- Éclater chaque cellule rôle → une cellule par membre roster du rôle
INSERT INTO "ProjectRaciCell" (
  "id", "clientId", "projectId", "actionId", "roleId", "identityKey", "kind", "createdAt", "updatedAt"
)
SELECT
  replace(gen_random_uuid()::text, '-', ''),
  c."clientId",
  c."projectId",
  c."actionId",
  c."roleId",
  m."identityKey",
  c."kind",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProjectRaciCell" c
INNER JOIN "ProjectTeamMember" m
  ON m."roleId" = c."roleId"
 AND m."projectId" = c."projectId"
 AND m."clientId" = c."clientId"
WHERE c."identityKey" IS NULL
  AND c."roleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectRaciCell" x
    WHERE x."projectId" = c."projectId"
      AND x."actionId" = c."actionId"
      AND x."identityKey" = m."identityKey"
  );

-- Supprimer les anciennes lignes rôle non migrées (remplacées par les inserts)
DELETE FROM "ProjectRaciCell"
WHERE "identityKey" IS NULL
  AND "roleId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "ProjectTeamMember" m
    WHERE m."roleId" = "ProjectRaciCell"."roleId"
      AND m."projectId" = "ProjectRaciCell"."projectId"
  );

-- Cellules sans membre : acteur technique
UPDATE "ProjectRaciCell" c
SET "identityKey" = 'legacy-role:' || c."roleId"
WHERE c."identityKey" IS NULL
  AND c."roleId" IS NOT NULL;

DELETE FROM "ProjectRaciCell" WHERE "identityKey" IS NULL;

ALTER TABLE "ProjectRaciCell" ALTER COLUMN "identityKey" SET NOT NULL;

-- Un seul ACCOUNTABLE par action
DELETE FROM "ProjectRaciCell" c
WHERE c."kind" = 'ACCOUNTABLE'
  AND c."id" NOT IN (
    SELECT DISTINCT ON ("projectId", "actionId") "id"
    FROM "ProjectRaciCell"
    WHERE "kind" = 'ACCOUNTABLE'
    ORDER BY "projectId", "actionId", "createdAt" ASC, "id" ASC
  );

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRaciCell_projectId_actionId_identityKey_key"
  ON "ProjectRaciCell"("projectId", "actionId", "identityKey");

CREATE INDEX IF NOT EXISTS "ProjectRaciCell_identityKey_idx"
  ON "ProjectRaciCell"("identityKey");

ALTER TABLE "ProjectRaciCell" DROP CONSTRAINT IF EXISTS "ProjectRaciCell_roleId_fkey";
ALTER TABLE "ProjectRaciCell"
  ADD CONSTRAINT "ProjectRaciCell_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "ProjectTeamRole"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
