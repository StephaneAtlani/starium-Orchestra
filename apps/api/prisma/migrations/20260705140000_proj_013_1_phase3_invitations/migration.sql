-- RFC-PROJ-013-1 Phase 3 — email externe, champs Graph, traçabilité EmailDelivery

ALTER TABLE "ProjectReviewParticipant"
  ADD COLUMN "externalEmail" TEXT,
  ADD COLUMN "lastEmailedAt" TIMESTAMP(3);

ALTER TABLE "ProjectReview"
  ADD COLUMN "microsoftOnlineMeetingId" TEXT,
  ADD COLUMN "microsoftEventId" TEXT,
  ADD COLUMN "microsoftMeetingOrganizerUserId" TEXT;

CREATE INDEX "ProjectReview_clientId_microsoftEventId_idx"
  ON "ProjectReview"("clientId", "microsoftEventId");

ALTER TABLE "ProjectReview"
  ADD CONSTRAINT "ProjectReview_microsoftMeetingOrganizerUserId_fkey"
  FOREIGN KEY ("microsoftMeetingOrganizerUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailDelivery"
  ADD COLUMN "projectReviewId" TEXT;

CREATE INDEX "EmailDelivery_clientId_projectReviewId_idx"
  ON "EmailDelivery"("clientId", "projectReviewId");
