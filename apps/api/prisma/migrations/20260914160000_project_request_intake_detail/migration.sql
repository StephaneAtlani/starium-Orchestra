-- AlterTable ProjectRequest — handoff Demandes 2026-09-14 (formulaire étendu)
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "expectedOutcome" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "affectedScope" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "affectedUsersCount" INTEGER;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "deadlineRationale" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "knownConstraints" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "solutionsTried" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "strategicObjectiveLabel" TEXT;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "swot" JSONB;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "tows" JSONB;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "budgetUnknown" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectRequest" ADD COLUMN IF NOT EXISTS "effortUnknown" BOOLEAN NOT NULL DEFAULT false;
