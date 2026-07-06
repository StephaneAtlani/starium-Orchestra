-- RFC-PROJ-013-2 Migration A — add new ProjectReviewStatus enum values only
ALTER TYPE "ProjectReviewStatus" ADD VALUE 'PREPARING';
ALTER TYPE "ProjectReviewStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ProjectReviewStatus" ADD VALUE 'IN_PROGRESS';
