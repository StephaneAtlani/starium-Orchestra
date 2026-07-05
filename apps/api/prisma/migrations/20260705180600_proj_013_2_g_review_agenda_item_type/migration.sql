-- RFC-PROJ-013-2 Migration G — agenda item type
CREATE TYPE "ProjectReviewAgendaItemType" AS ENUM (
  'INFORMATION',
  'DECISION',
  'ARBITRATION',
  'RISK',
  'ACTION_REVIEW',
  'BUDGET',
  'MILESTONE',
  'OTHER'
);

ALTER TABLE "ProjectReviewAgendaItem"
  ADD COLUMN "itemType" "ProjectReviewAgendaItemType" NOT NULL DEFAULT 'INFORMATION',
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "expectedDecision" TEXT;

UPDATE "ProjectReviewAgendaItem" SET "itemType" = 'INFORMATION' WHERE "itemType" IS NULL;
