-- RFC-PROJ-023 — équipes projet convocables (enrichissement cercles + convocation)

CREATE TYPE "ProjectTeamColorToken" AS ENUM ('BROWN', 'BLUE', 'VIOLET', 'TEAL', 'GREEN', 'RED');

-- Truncate names longer than 24 before altering column (seed / legacy)
UPDATE "ProjectGovernanceCircle"
SET "name" = LEFT("name", 24)
WHERE char_length("name") > 24;

ALTER TABLE "ProjectGovernanceCircle"
  ADD COLUMN IF NOT EXISTS "label" TEXT,
  ADD COLUMN IF NOT EXISTS "colorToken" "ProjectTeamColorToken" NOT NULL DEFAULT 'BROWN',
  ADD COLUMN IF NOT EXISTS "pilotIdentityKey" VARCHAR(150);

ALTER TABLE "ProjectGovernanceCircle"
  ALTER COLUMN "name" TYPE VARCHAR(24);

ALTER TABLE "ProjectTeamGovernanceMembership"
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectTeamGovernanceMembership_userId_idx"
  ON "ProjectTeamGovernanceMembership"("userId");

ALTER TABLE "ProjectTeamGovernanceMembership"
  ADD CONSTRAINT "ProjectTeamGovernanceMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProjectReviewTeamConvocation" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "projectReviewId" TEXT NOT NULL,
  "teamId" TEXT,
  "teamNameSnapshot" VARCHAR(24) NOT NULL,
  "convenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectReviewTeamConvocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectReviewTeamConvocation_projectReviewId_teamId_key"
  ON "ProjectReviewTeamConvocation"("projectReviewId", "teamId");

CREATE INDEX IF NOT EXISTS "ProjectReviewTeamConvocation_clientId_idx"
  ON "ProjectReviewTeamConvocation"("clientId");

CREATE INDEX IF NOT EXISTS "ProjectReviewTeamConvocation_clientId_projectId_idx"
  ON "ProjectReviewTeamConvocation"("clientId", "projectId");

CREATE INDEX IF NOT EXISTS "ProjectReviewTeamConvocation_teamId_idx"
  ON "ProjectReviewTeamConvocation"("teamId");

CREATE INDEX IF NOT EXISTS "ProjectReviewTeamConvocation_projectReviewId_idx"
  ON "ProjectReviewTeamConvocation"("projectReviewId");

ALTER TABLE "ProjectReviewTeamConvocation"
  ADD CONSTRAINT "ProjectReviewTeamConvocation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewTeamConvocation"
  ADD CONSTRAINT "ProjectReviewTeamConvocation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewTeamConvocation"
  ADD CONSTRAINT "ProjectReviewTeamConvocation_projectReviewId_fkey"
  FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewTeamConvocation"
  ADD CONSTRAINT "ProjectReviewTeamConvocation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "ProjectGovernanceCircle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
