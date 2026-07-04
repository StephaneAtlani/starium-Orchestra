-- Migration B — RFC-PROJ-013-1 : data-migration DRAFT → IN_REVIEW

UPDATE "ProjectReview" SET "status" = 'IN_REVIEW' WHERE "status" = 'DRAFT';
