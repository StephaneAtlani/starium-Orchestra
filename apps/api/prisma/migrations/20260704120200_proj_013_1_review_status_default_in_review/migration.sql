-- Migration C — RFC-PROJ-013-1 : default status IN_REVIEW

ALTER TABLE "ProjectReview" ALTER COLUMN "status" SET DEFAULT 'IN_REVIEW';
