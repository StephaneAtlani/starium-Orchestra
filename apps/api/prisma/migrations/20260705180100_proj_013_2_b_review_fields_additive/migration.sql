-- RFC-PROJ-013-2 Migration B — additive ProjectReview fields
ALTER TABLE "ProjectReview" ALTER COLUMN "reviewDate" DROP NOT NULL;

ALTER TABLE "ProjectReview" ADD COLUMN "objective" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "periodEnd" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "ProjectReview" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "ProjectReview" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "ProjectReview" ADD COLUMN "cancelledByUserId" TEXT;

UPDATE "ProjectReview" SET "objective" = COALESCE("objective", "executiveSummary");

ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
