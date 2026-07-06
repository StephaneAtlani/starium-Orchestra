-- Migration E — RFC-PROJ-013-1 : participants attendanceStatus + timestamps (sans agenda)

CREATE TYPE "ProjectReviewParticipantAttendanceStatus" AS ENUM ('EXPECTED', 'PRESENT', 'ABSENT', 'EXCUSED');

ALTER TABLE "ProjectReviewParticipant"
  ADD COLUMN "roleLabel" TEXT,
  ADD COLUMN "attendanceStatus" "ProjectReviewParticipantAttendanceStatus" NOT NULL DEFAULT 'EXPECTED';

UPDATE "ProjectReviewParticipant" SET "attendanceStatus" = 'PRESENT' WHERE "attended" = true;
UPDATE "ProjectReviewParticipant" SET "attendanceStatus" = 'EXPECTED' WHERE "attended" = false OR "attended" IS NULL;

ALTER TABLE "ProjectReviewParticipant"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "ProjectReviewParticipant" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

ALTER TABLE "ProjectReviewParticipant"
  ALTER COLUMN "updatedAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ProjectReviewParticipant_clientId_projectReviewId_idx"
  ON "ProjectReviewParticipant"("clientId", "projectReviewId");
CREATE INDEX "ProjectReviewParticipant_userId_idx"
  ON "ProjectReviewParticipant"("userId");
