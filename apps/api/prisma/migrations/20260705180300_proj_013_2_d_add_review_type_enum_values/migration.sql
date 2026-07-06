-- RFC-PROJ-013-2 Migration D — add new ProjectReviewType enum values only
ALTER TYPE "ProjectReviewType" ADD VALUE 'PROJECT_REVIEW';
ALTER TYPE "ProjectReviewType" ADD VALUE 'BUDGET_REVIEW';
ALTER TYPE "ProjectReviewType" ADD VALUE 'ARBITRATION';
ALTER TYPE "ProjectReviewType" ADD VALUE 'CRISIS_POINT';
ALTER TYPE "ProjectReviewType" ADD VALUE 'OTHER';
