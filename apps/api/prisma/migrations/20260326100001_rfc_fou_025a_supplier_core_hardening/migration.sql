-- RFC-FOU-025-A Supplier Core hardening
-- 1) add nullable columns
ALTER TABLE "Supplier"
  ADD COLUMN "normalizedName" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "notes" TEXT;

-- 2) backfill normalized + normalized persisted values
UPDATE "Supplier"
SET
  "normalizedName" = regexp_replace(lower(btrim("name")), '\s+', ' ', 'g'),
  "externalId" = NULLIF(btrim("externalId"), ''),
  "vatNumber" = NULLIF(replace(upper(btrim("vatNumber")), ' ', ''), ''),
  "email" = NULLIF(lower(btrim("email")), ''),
  "phone" = NULLIF(btrim("phone"), ''),
  "website" = NULLIF(btrim("website"), ''),
  "notes" = NULLIF(btrim("notes"), '');

-- 3) detect collisions before constraints
DO $$
DECLARE
  normalized_name_collisions TEXT;
  external_id_collisions TEXT;
  vat_number_collisions TEXT;
BEGIN
  SELECT string_agg(format('%s/%s', "clientId", "normalizedName"), ', ')
  INTO normalized_name_collisions
  FROM (
    SELECT "clientId", "normalizedName"
    FROM "Supplier"
    GROUP BY "clientId", "normalizedName"
    HAVING COUNT(*) > 1
  ) c;

  IF normalized_name_collisions IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: duplicate normalizedName values detected (%). Resolve duplicates before rerun.',
      normalized_name_collisions;
  END IF;

  SELECT string_agg(format('%s/%s', "clientId", btrim("externalId")), ', ')
  INTO external_id_collisions
  FROM (
    SELECT "clientId", btrim("externalId") AS "externalId"
    FROM "Supplier"
    WHERE "externalId" IS NOT NULL AND btrim("externalId") <> ''
    GROUP BY "clientId", btrim("externalId")
    HAVING COUNT(*) > 1
  ) c;

  IF external_id_collisions IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: duplicate externalId values detected (%). Resolve duplicates before rerun.',
      external_id_collisions;
  END IF;

  SELECT string_agg(format('%s/%s', "clientId", replace(upper(btrim("vatNumber")), ' ', '')), ', ')
  INTO vat_number_collisions
  FROM (
    SELECT "clientId", replace(upper(btrim("vatNumber")), ' ', '') AS "vatNumber"
    FROM "Supplier"
    WHERE "vatNumber" IS NOT NULL AND btrim("vatNumber") <> ''
    GROUP BY "clientId", replace(upper(btrim("vatNumber")), ' ', '')
    HAVING COUNT(*) > 1
  ) c;

  IF vat_number_collisions IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: duplicate vatNumber values detected (%). Resolve duplicates before rerun.',
      vat_number_collisions;
  END IF;
END $$;

-- 4) normalizedName required
ALTER TABLE "Supplier"
  ALTER COLUMN "normalizedName" SET NOT NULL;

-- 5) drop old unique on (clientId, name)
DROP INDEX IF EXISTS "Supplier_clientId_name_key";

-- 6) create new unique and supporting indexes
CREATE UNIQUE INDEX "Supplier_clientId_normalizedName_key"
  ON "Supplier"("clientId", "normalizedName");

DROP INDEX IF EXISTS "Supplier_clientId_name_idx";
CREATE INDEX "Supplier_clientId_status_idx" ON "Supplier"("clientId", "status");
CREATE INDEX "Supplier_clientId_vatNumber_idx" ON "Supplier"("clientId", "vatNumber");
CREATE INDEX "Supplier_clientId_externalId_idx" ON "Supplier"("clientId", "externalId");

-- Partial expression uniques are SQL-only (unsupported by Prisma schema DSL).
CREATE UNIQUE INDEX "Supplier_clientId_externalId_norm_unique_partial"
  ON "Supplier"("clientId", btrim("externalId"))
  WHERE "externalId" IS NOT NULL AND btrim("externalId") <> '';

CREATE UNIQUE INDEX "Supplier_clientId_vatNumber_norm_unique_partial"
  ON "Supplier"("clientId", replace(upper(btrim("vatNumber")), ' ', ''))
  WHERE "vatNumber" IS NOT NULL AND btrim("vatNumber") <> '';
