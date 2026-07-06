-- RFC-PROJ-013-2 Migration E — migrate legacy review types (enum values committed in D)
UPDATE "ProjectReview" SET "reviewType" = 'PROJECT_REVIEW' WHERE "reviewType" = 'CODIR_REVIEW';
UPDATE "ProjectReview" SET "reviewType" = 'OTHER' WHERE "reviewType" = 'AD_HOC';
