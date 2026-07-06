-- RFC-PROJ-013-2 Migration C — migrate legacy status values (enum values committed in A)
UPDATE "ProjectReview" SET "status" = 'PREPARING' WHERE "status" = 'DRAFT' AND "startedAt" IS NULL;
UPDATE "ProjectReview" SET "status" = 'IN_PROGRESS' WHERE "status" = 'DRAFT' AND "startedAt" IS NOT NULL;
UPDATE "ProjectReview" SET "status" = 'PREPARING' WHERE "status" = 'PLANNED' AND "reviewDate" IS NULL;
UPDATE "ProjectReview" SET "status" = 'SCHEDULED' WHERE "status" = 'PLANNED' AND "reviewDate" IS NOT NULL;
UPDATE "ProjectReview" SET "status" = 'IN_PROGRESS' WHERE "status" = 'IN_REVIEW';
