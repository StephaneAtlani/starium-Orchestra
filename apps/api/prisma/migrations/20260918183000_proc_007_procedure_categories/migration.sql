-- RFC-PROC-007 F2 — enum ProcedureCategory → table référentiel client

-- 1) Extraire le code enum en texte avant de supprimer le type
ALTER TABLE "Procedure" ADD COLUMN "categoryCode" TEXT;
UPDATE "Procedure" SET "categoryCode" = category::text;
ALTER TABLE "Procedure" DROP COLUMN "category";
DROP TYPE "ProcedureCategory";

-- 2) Table référentiel
CREATE TABLE "ProcedureCategory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcedureCategory_clientId_isActive_sortOrder_idx"
  ON "ProcedureCategory"("clientId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "ProcedureCategory_clientId_code_key"
  ON "ProcedureCategory"("clientId", "code");

ALTER TABLE "ProcedureCategory"
  ADD CONSTRAINT "ProcedureCategory_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Seed 5 catégories pour chaque client
INSERT INTO "ProcedureCategory" ("id", "clientId", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(c.id || ':' || d.code),
  c.id,
  d.code,
  d.label,
  d.sort_order,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c
CROSS JOIN (
  VALUES
    ('PILOTAGE', 'Pilotage', 0),
    ('COMPLIANCE', 'Conformité', 1),
    ('FINANCE', 'Finance', 2),
    ('ORGANISATION', 'Organisation', 3),
    ('SECURITY', 'Sécurité', 4)
) AS d(code, label, sort_order);

-- 4) FK sur Procedure
ALTER TABLE "Procedure" ADD COLUMN "categoryId" TEXT;

UPDATE "Procedure" p
SET "categoryId" = cat.id
FROM "ProcedureCategory" cat
WHERE cat."clientId" = p."clientId"
  AND cat.code = p."categoryCode";

UPDATE "Procedure" p
SET "categoryId" = cat.id
FROM "ProcedureCategory" cat
WHERE p."categoryId" IS NULL
  AND cat."clientId" = p."clientId"
  AND cat.code = 'PILOTAGE';

ALTER TABLE "Procedure" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Procedure" DROP COLUMN "categoryCode";

CREATE INDEX "Procedure_clientId_categoryId_idx" ON "Procedure"("clientId", "categoryId");

ALTER TABLE "Procedure"
  ADD CONSTRAINT "Procedure_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProcedureCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
