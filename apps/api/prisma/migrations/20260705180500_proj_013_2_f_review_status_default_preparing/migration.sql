-- RFC-PROJ-013-2 Migration F — default status PREPARING (after A)
ALTER TABLE "ProjectReview" ALTER COLUMN "status" SET DEFAULT 'PREPARING';
