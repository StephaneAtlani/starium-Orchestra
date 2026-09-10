-- RFC-PROJ-013-7 — états UI listes + séries

CREATE TYPE "ProjectReviewSeriesFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

CREATE TABLE "ProjectReviewSeries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reviewType" "ProjectReviewType" NOT NULL,
    "frequency" "ProjectReviewSeriesFrequency" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "meetingMode" "ProjectReviewMeetingMode",
    "location" TEXT,
    "defaultObjective" TEXT,
    "permanentParticipantUserIds" JSONB NOT NULL,
    "anchorDate" TIMESTAMP(3) NOT NULL,
    "horizonCount" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReviewSeries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectReview" ADD COLUMN "agendaLockedAt" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "agendaLockedByUserId" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "conductClosedAt" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "seriesId" TEXT;

CREATE INDEX "ProjectReview_clientId_projectId_agendaLockedAt_idx" ON "ProjectReview"("clientId", "projectId", "agendaLockedAt");
CREATE INDEX "ProjectReview_clientId_projectId_conductClosedAt_idx" ON "ProjectReview"("clientId", "projectId", "conductClosedAt");
CREATE INDEX "ProjectReview_seriesId_idx" ON "ProjectReview"("seriesId");
CREATE INDEX "ProjectReviewSeries_clientId_projectId_isActive_idx" ON "ProjectReviewSeries"("clientId", "projectId", "isActive");

ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_agendaLockedByUserId_fkey" FOREIGN KEY ("agendaLockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProjectReviewSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewSeries" ADD CONSTRAINT "ProjectReviewSeries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewSeries" ADD CONSTRAINT "ProjectReviewSeries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewSeries" ADD CONSTRAINT "ProjectReviewSeries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
