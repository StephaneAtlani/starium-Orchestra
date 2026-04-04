-- RFC-TEAM-020 — Module Équipes : Resource HUMAN comme référentiel (équipes, staffing planifié, temps réalisé).

-- Enum temps réalisé
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');

-- Champs RH sur Resource
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "mobile" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "employeeNumber" TEXT;

-- Table temps réalisé (distincte de TeamResourceAssignment)
CREATE TABLE "ResourceTimeEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "durationHours" DECIMAL(8,2) NOT NULL,
    "projectId" TEXT,
    "activityTypeId" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" VARCHAR(4000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceTimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResourceTimeEntry_clientId_resourceId_idx" ON "ResourceTimeEntry"("clientId", "resourceId");
CREATE INDEX "ResourceTimeEntry_clientId_workDate_idx" ON "ResourceTimeEntry"("clientId", "workDate");
CREATE INDEX "ResourceTimeEntry_clientId_projectId_idx" ON "ResourceTimeEntry"("clientId", "projectId");
CREATE INDEX "ResourceTimeEntry_clientId_status_idx" ON "ResourceTimeEntry"("clientId", "status");

ALTER TABLE "ResourceTimeEntry" ADD CONSTRAINT "ResourceTimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeEntry" ADD CONSTRAINT "ResourceTimeEntry_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeEntry" ADD CONSTRAINT "ResourceTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeEntry" ADD CONSTRAINT "ResourceTimeEntry_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 1) Créer une Resource HUMAN par Collaborator référencé (même id que le Collaborator quand possible).
--    Si une Resource existe déjà avec le même (clientId, email) mais un autre id (ex. seed catalogue Humain),
--    on n'insère pas : les UPDATE ci-dessous résolvent resourceId par id ou par email.
INSERT INTO "Resource" ("id", "clientId", "name", "firstName", "type", "email", "jobTitle", "department", "phone", "mobile", "employeeNumber", "createdAt", "updatedAt")
SELECT
  c."id",
  c."clientId",
  c."displayName",
  c."firstName",
  'HUMAN'::"ResourceType",
  c."email",
  c."jobTitle",
  c."department",
  c."phone",
  c."mobile",
  c."employeeNumber",
  c."createdAt",
  c."updatedAt"
FROM "Collaborator" c
WHERE c."id" IN (
  SELECT "collaboratorId" FROM "WorkTeamMembership"
  UNION
  SELECT "collaboratorId" FROM "TeamResourceAssignment"
  UNION
  SELECT "leadCollaboratorId" FROM "WorkTeam" WHERE "leadCollaboratorId" IS NOT NULL
  UNION
  SELECT "managerCollaboratorId" FROM "ManagerScopeConfig"
)
AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."id" = c."id")
AND NOT EXISTS (
  SELECT 1 FROM "Resource" r
  WHERE r."clientId" = c."clientId"
    AND c."email" IS NOT NULL
    AND r."email" = c."email"
)
ON CONFLICT ("id") DO NOTHING;

-- 2) TeamResourceAssignment : ajouter resourceId, copier depuis collaboratorId, supprimer ancienne FK
ALTER TABLE "TeamResourceAssignment" ADD COLUMN "resourceId" TEXT;

UPDATE "TeamResourceAssignment" t SET "resourceId" = COALESCE(
  (SELECT r."id" FROM "Resource" r WHERE r."id" = t."collaboratorId"),
  (SELECT r."id" FROM "Resource" r
   INNER JOIN "Collaborator" c ON c."id" = t."collaboratorId"
   WHERE r."clientId" = c."clientId"
     AND r."email" IS NOT DISTINCT FROM c."email"
   LIMIT 1)
);

ALTER TABLE "TeamResourceAssignment" DROP CONSTRAINT "TeamResourceAssignment_collaboratorId_fkey";

DROP INDEX IF EXISTS "TeamResourceAssignment_clientId_collaboratorId_idx";

ALTER TABLE "TeamResourceAssignment" DROP COLUMN "collaboratorId";

ALTER TABLE "TeamResourceAssignment" ALTER COLUMN "resourceId" SET NOT NULL;

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TeamResourceAssignment_clientId_resourceId_idx" ON "TeamResourceAssignment"("clientId", "resourceId");

-- 3) WorkTeamMembership
ALTER TABLE "WorkTeamMembership" ADD COLUMN "resourceId" TEXT;

UPDATE "WorkTeamMembership" m SET "resourceId" = COALESCE(
  (SELECT r."id" FROM "Resource" r WHERE r."id" = m."collaboratorId"),
  (SELECT r."id" FROM "Resource" r
   INNER JOIN "Collaborator" c ON c."id" = m."collaboratorId"
   WHERE r."clientId" = c."clientId"
     AND r."email" IS NOT DISTINCT FROM c."email"
   LIMIT 1)
);

ALTER TABLE "WorkTeamMembership" DROP CONSTRAINT "WorkTeamMembership_collaboratorId_fkey";

DROP INDEX IF EXISTS "WorkTeamMembership_clientId_collaboratorId_idx";

-- Unicité créée comme UNIQUE INDEX (migration work-teams), pas comme CONSTRAINT nommée
DROP INDEX IF EXISTS "WorkTeamMembership_workTeamId_collaboratorId_key";

ALTER TABLE "WorkTeamMembership" DROP COLUMN "collaboratorId";

ALTER TABLE "WorkTeamMembership" ALTER COLUMN "resourceId" SET NOT NULL;

ALTER TABLE "WorkTeamMembership" ADD CONSTRAINT "WorkTeamMembership_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkTeamMembership" ADD CONSTRAINT "WorkTeamMembership_workTeamId_resourceId_key" UNIQUE ("workTeamId", "resourceId");

CREATE INDEX "WorkTeamMembership_clientId_resourceId_idx" ON "WorkTeamMembership"("clientId", "resourceId");

-- 4) WorkTeam lead
ALTER TABLE "WorkTeam" ADD COLUMN "leadResourceId" TEXT;

UPDATE "WorkTeam" w SET "leadResourceId" = COALESCE(
  (SELECT r."id" FROM "Resource" r WHERE r."id" = w."leadCollaboratorId"),
  (SELECT r."id" FROM "Resource" r
   INNER JOIN "Collaborator" c ON c."id" = w."leadCollaboratorId"
   WHERE r."clientId" = c."clientId"
     AND r."email" IS NOT DISTINCT FROM c."email"
   LIMIT 1)
) WHERE w."leadCollaboratorId" IS NOT NULL;

ALTER TABLE "WorkTeam" DROP CONSTRAINT IF EXISTS "WorkTeam_leadCollaboratorId_fkey";

ALTER TABLE "WorkTeam" DROP COLUMN "leadCollaboratorId";

ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_leadResourceId_fkey" FOREIGN KEY ("leadResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) ManagerScopeConfig
ALTER TABLE "ManagerScopeConfig" ADD COLUMN "managerResourceId" TEXT;

UPDATE "ManagerScopeConfig" m SET "managerResourceId" = COALESCE(
  (SELECT r."id" FROM "Resource" r WHERE r."id" = m."managerCollaboratorId"),
  (SELECT r."id" FROM "Resource" r
   INNER JOIN "Collaborator" c ON c."id" = m."managerCollaboratorId"
   WHERE r."clientId" = c."clientId"
     AND r."email" IS NOT DISTINCT FROM c."email"
   LIMIT 1)
);

ALTER TABLE "ManagerScopeConfig" DROP CONSTRAINT "ManagerScopeConfig_managerCollaboratorId_fkey";

DROP INDEX IF EXISTS "ManagerScopeConfig_managerCollaboratorId_key";

ALTER TABLE "ManagerScopeConfig" DROP COLUMN "managerCollaboratorId";

ALTER TABLE "ManagerScopeConfig" ALTER COLUMN "managerResourceId" SET NOT NULL;

ALTER TABLE "ManagerScopeConfig" ADD CONSTRAINT "ManagerScopeConfig_managerResourceId_key" UNIQUE ("managerResourceId");

ALTER TABLE "ManagerScopeConfig" ADD CONSTRAINT "ManagerScopeConfig_managerResourceId_fkey" FOREIGN KEY ("managerResourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
