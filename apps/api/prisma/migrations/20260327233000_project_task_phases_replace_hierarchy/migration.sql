-- Replace recursive task hierarchy with functional phases.

CREATE TABLE "ProjectTaskPhase" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTaskPhase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectTaskPhase_clientId_projectId_idx"
  ON "ProjectTaskPhase"("clientId", "projectId");
CREATE INDEX "ProjectTaskPhase_projectId_sortOrder_idx"
  ON "ProjectTaskPhase"("projectId", "sortOrder");
CREATE UNIQUE INDEX "ProjectTaskPhase_projectId_sortOrder_key"
  ON "ProjectTaskPhase"("projectId", "sortOrder");

ALTER TABLE "ProjectTask"
  ADD COLUMN "phaseId" TEXT;

CREATE INDEX "ProjectTask_phaseId_idx" ON "ProjectTask"("phaseId");
CREATE INDEX "ProjectTask_projectId_phaseId_sortOrder_idx"
  ON "ProjectTask"("projectId", "phaseId", "sortOrder");

ALTER TABLE "ProjectTaskPhase"
  ADD CONSTRAINT "ProjectTaskPhase_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTaskPhase"
  ADD CONSTRAINT "ProjectTaskPhase_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTask"
  ADD CONSTRAINT "ProjectTask_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "ProjectTaskPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one phase per root having descendants.
WITH RECURSIVE roots AS (
  SELECT
    t."id" AS "rootId",
    t."clientId",
    t."projectId",
    t."name" AS "rootName",
    t."sortOrder" AS "rootSortOrder",
    t."createdAt" AS "rootCreatedAt"
  FROM "ProjectTask" t
  WHERE t."parentTaskId" IS NULL
    AND EXISTS (SELECT 1 FROM "ProjectTask" c WHERE c."parentTaskId" = t."id")
),
ordered_roots AS (
  SELECT
    r.*,
    ROW_NUMBER() OVER (
      PARTITION BY r."projectId"
      ORDER BY r."rootSortOrder" ASC, r."rootCreatedAt" ASC, r."rootId" ASC
    ) - 1 AS "phaseSortOrder"
  FROM roots r
),
inserted_phases AS (
  INSERT INTO "ProjectTaskPhase" ("id", "clientId", "projectId", "name", "sortOrder", "createdAt", "updatedAt")
  SELECT
    'phase_' || md5(random()::text || clock_timestamp()::text || o."rootId"),
    o."clientId",
    o."projectId",
    o."rootName",
    o."phaseSortOrder",
    NOW(),
    NOW()
  FROM ordered_roots o
  RETURNING "id", "clientId", "projectId", "name", "sortOrder"
),
phase_map AS (
  SELECT
    o."rootId",
    p."id" AS "phaseId",
    o."projectId",
    o."clientId"
  FROM ordered_roots o
  JOIN inserted_phases p
    ON p."projectId" = o."projectId"
   AND p."clientId" = o."clientId"
   AND p."name" = o."rootName"
   AND p."sortOrder" = o."phaseSortOrder"
),
tree AS (
  SELECT
    pm."rootId",
    pm."phaseId",
    t."id" AS "taskId",
    t."id" AS "currentId",
    0 AS "depth",
    t."sortOrder",
    t."createdAt"
  FROM phase_map pm
  JOIN "ProjectTask" t ON t."id" = pm."rootId"
  UNION ALL
  SELECT
    tr."rootId",
    tr."phaseId",
    c."id" AS "taskId",
    c."id" AS "currentId",
    tr."depth" + 1 AS "depth",
    c."sortOrder",
    c."createdAt"
  FROM tree tr
  JOIN "ProjectTask" c ON c."parentTaskId" = tr."currentId"
),
ranked AS (
  SELECT
    tr."taskId",
    tr."phaseId",
    ROW_NUMBER() OVER (
      PARTITION BY tr."phaseId"
      ORDER BY tr."depth" ASC, tr."sortOrder" ASC, tr."createdAt" ASC, tr."taskId" ASC
    ) - 1 AS "newSortOrder"
  FROM tree tr
)
UPDATE "ProjectTask" t
SET
  "phaseId" = r."phaseId",
  "sortOrder" = r."newSortOrder"
FROM ranked r
WHERE t."id" = r."taskId";

DROP INDEX IF EXISTS "ProjectTask_parentTaskId_idx";
ALTER TABLE "ProjectTask" DROP CONSTRAINT IF EXISTS "ProjectTask_parentTaskId_fkey";
ALTER TABLE "ProjectTask" DROP COLUMN IF EXISTS "parentTaskId";
