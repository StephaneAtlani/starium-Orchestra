-- Migration D — RFC-PROJ-013-1 : ordre du jour + responsabilité actions (sans participants)

CREATE TYPE "ProjectReviewAgendaItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED');

CREATE TABLE "ProjectReviewAgendaItem" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectReviewId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "plannedDurationMinutes" INTEGER,
  "ownerUserId" TEXT,
  "status" "ProjectReviewAgendaItemStatus" NOT NULL DEFAULT 'TODO',
  "notes" TEXT,
  "decisionSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectReviewAgendaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectReviewActionItemContributor" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "actionItemId" TEXT NOT NULL,
  "userId" TEXT,
  "displayName" TEXT,
  "roleLabel" TEXT,
  "contributionStatus" TEXT,

  CONSTRAINT "ProjectReviewActionItemContributor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectReviewActionItem"
  ADD COLUMN "responsibleUserId" TEXT,
  ADD COLUMN "agendaItemId" TEXT;

ALTER TABLE "ProjectReviewDecision"
  ADD COLUMN "agendaItemId" TEXT;

CREATE INDEX "ProjectReviewAgendaItem_clientId_projectReviewId_orderIndex_idx"
  ON "ProjectReviewAgendaItem"("clientId", "projectReviewId", "orderIndex");
CREATE INDEX "ProjectReviewAgendaItem_projectReviewId_idx"
  ON "ProjectReviewAgendaItem"("projectReviewId");

CREATE INDEX "ProjectReviewActionItemContributor_clientId_idx"
  ON "ProjectReviewActionItemContributor"("clientId");
CREATE INDEX "ProjectReviewActionItemContributor_actionItemId_idx"
  ON "ProjectReviewActionItemContributor"("actionItemId");

CREATE INDEX "ProjectReviewActionItem_agendaItemId_idx"
  ON "ProjectReviewActionItem"("agendaItemId");
CREATE INDEX "ProjectReviewActionItem_responsibleUserId_idx"
  ON "ProjectReviewActionItem"("responsibleUserId");

CREATE INDEX "ProjectReviewDecision_agendaItemId_idx"
  ON "ProjectReviewDecision"("agendaItemId");

ALTER TABLE "ProjectReviewAgendaItem"
  ADD CONSTRAINT "ProjectReviewAgendaItem_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAgendaItem"
  ADD CONSTRAINT "ProjectReviewAgendaItem_projectReviewId_fkey"
  FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAgendaItem"
  ADD CONSTRAINT "ProjectReviewAgendaItem_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewActionItemContributor"
  ADD CONSTRAINT "ProjectReviewActionItemContributor_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewActionItemContributor"
  ADD CONSTRAINT "ProjectReviewActionItemContributor_actionItemId_fkey"
  FOREIGN KEY ("actionItemId") REFERENCES "ProjectReviewActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewActionItemContributor"
  ADD CONSTRAINT "ProjectReviewActionItemContributor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewActionItem"
  ADD CONSTRAINT "ProjectReviewActionItem_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewActionItem"
  ADD CONSTRAINT "ProjectReviewActionItem_agendaItemId_fkey"
  FOREIGN KEY ("agendaItemId") REFERENCES "ProjectReviewAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectReviewDecision"
  ADD CONSTRAINT "ProjectReviewDecision_agendaItemId_fkey"
  FOREIGN KEY ("agendaItemId") REFERENCES "ProjectReviewAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
