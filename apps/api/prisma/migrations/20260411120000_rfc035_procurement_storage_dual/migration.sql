-- RFC-035 — dual backend procurement (local + S3).
--
-- PlatformProcurementS3Settings n’existe qu’à partir de
-- 20260417120000_rfc034_procurement_attachments_s3_settings.
-- Ici : enum uniquement ; colonnes ajoutées si la table existe déjà (drift),
-- sinon créées avec la table dans rfc034 (voir migration 17120000).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcurementStorageDriver') THEN
    CREATE TYPE "ProcurementStorageDriver" AS ENUM ('LOCAL', 'S3');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."PlatformProcurementS3Settings"') IS NOT NULL THEN
    ALTER TABLE "PlatformProcurementS3Settings"
      ADD COLUMN IF NOT EXISTS "storageDriver" "ProcurementStorageDriver" NOT NULL DEFAULT 'S3';
    ALTER TABLE "PlatformProcurementS3Settings"
      ADD COLUMN IF NOT EXISTS "localRoot" TEXT;
  END IF;
END $$;
