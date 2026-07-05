-- RFC-PROJ-013-2 Migration J — enriched action items
ALTER TABLE "ProjectReviewActionItem"
  ADD COLUMN "decisionId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "priority" "ProjectTaskPriority";

CREATE INDEX "ProjectReviewActionItem_decisionId_idx" ON "ProjectReviewActionItem"("decisionId");

ALTER TABLE "ProjectReviewActionItem" ADD CONSTRAINT "ProjectReviewActionItem_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "ProjectReviewDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
