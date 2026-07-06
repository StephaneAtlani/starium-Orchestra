-- RFC-PROJ-013-1 Phase 2 — invitation timestamps on participants
ALTER TABLE "ProjectReviewParticipant"
  ADD COLUMN "invitedAt" TIMESTAMP(3),
  ADD COLUMN "lastInvitedAt" TIMESTAMP(3);
