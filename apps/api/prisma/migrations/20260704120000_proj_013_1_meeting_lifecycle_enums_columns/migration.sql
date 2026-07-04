-- Migration A — RFC-PROJ-013-1 : enum lifecycle + colonnes réunion (sans SET DEFAULT ni UPDATE status)

ALTER TYPE "ProjectReviewStatus" ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE "ProjectReviewStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';

CREATE TYPE "ProjectReviewMeetingMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

ALTER TABLE "ProjectReview"
  ADD COLUMN "meetingMode" "ProjectReviewMeetingMode",
  ADD COLUMN "meetingUrl" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "startedByUserId" TEXT;

ALTER TABLE "ProjectReview"
  ADD CONSTRAINT "ProjectReview_startedByUserId_fkey"
  FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
