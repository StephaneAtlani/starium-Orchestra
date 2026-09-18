-- ProcedureStatus: add IN_REVIEW
ALTER TYPE "ProcedureStatus" ADD VALUE 'IN_REVIEW';

-- ProcedureCategory: remap to mock enum
CREATE TYPE "ProcedureCategory_new" AS ENUM ('PILOTAGE', 'COMPLIANCE', 'FINANCE', 'ORGANISATION', 'SECURITY');

ALTER TABLE "Procedure" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "Procedure" ALTER COLUMN "category" TYPE "ProcedureCategory_new" USING (
  CASE "category"::text
    WHEN 'COMPLIANCE' THEN 'COMPLIANCE'::"ProcedureCategory_new"
    WHEN 'SECURITY' THEN 'SECURITY'::"ProcedureCategory_new"
    WHEN 'OPERATIONS' THEN 'PILOTAGE'::"ProcedureCategory_new"
    WHEN 'IT_SERVICE' THEN 'PILOTAGE'::"ProcedureCategory_new"
    WHEN 'HR' THEN 'ORGANISATION'::"ProcedureCategory_new"
    WHEN 'OTHER' THEN 'PILOTAGE'::"ProcedureCategory_new"
    ELSE 'PILOTAGE'::"ProcedureCategory_new"
  END
);

DROP TYPE "ProcedureCategory";
ALTER TYPE "ProcedureCategory_new" RENAME TO "ProcedureCategory";

ALTER TABLE "Procedure" ALTER COLUMN "category" SET DEFAULT 'PILOTAGE'::"ProcedureCategory";

-- Wipe TipTap → EMPTY_V2 (module jamais en prod)
UPDATE "ProcedureVersion"
SET "contentJson" = '{"schemaVersion":2,"blocks":[{"t":"h1","html":""},{"t":"p","html":""}]}'::jsonb;
