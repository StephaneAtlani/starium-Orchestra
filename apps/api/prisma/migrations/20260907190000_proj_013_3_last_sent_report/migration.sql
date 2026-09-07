-- RFC-PROJ-013-3 C7a — payload CR envoyé (DCP, purge avec le point via cascade).
ALTER TABLE "ProjectReview" ADD COLUMN "lastSentReportAt" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "lastSentReportHtml" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "lastSentReportText" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "lastSentReportSubject" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "lastSentReportTitle" TEXT;
