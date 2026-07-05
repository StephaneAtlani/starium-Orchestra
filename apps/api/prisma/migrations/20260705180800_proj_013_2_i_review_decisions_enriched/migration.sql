-- RFC-PROJ-013-2 Migration I — enriched decisions
CREATE TYPE "ProjectReviewDecisionType" AS ENUM (
  'GO',
  'NO_GO',
  'ARBITRATION',
  'BUDGET_VALIDATION',
  'SCOPE_CHANGE',
  'RISK_ACCEPTANCE',
  'PRIORITY_CHANGE',
  'OTHER'
);

CREATE TYPE "ProjectReviewDecisionStatus" AS ENUM (
  'DRAFT',
  'VALIDATED',
  'REJECTED',
  'SUPERSEDED'
);

ALTER TABLE "ProjectReviewDecision"
  ADD COLUMN "decisionType" "ProjectReviewDecisionType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "status" "ProjectReviewDecisionStatus" NOT NULL DEFAULT 'VALIDATED',
  ADD COLUMN "decidedByUserId" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "impact" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ProjectReviewDecision" SET "decisionType" = 'OTHER' WHERE "decisionType" IS NULL;
UPDATE "ProjectReviewDecision" SET "status" = 'VALIDATED' WHERE "status" IS NULL;
UPDATE "ProjectReviewDecision" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "ProjectReviewDecision" ADD CONSTRAINT "ProjectReviewDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
