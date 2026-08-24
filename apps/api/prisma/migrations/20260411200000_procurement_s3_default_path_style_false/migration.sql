-- AWS S3 public : path-style forcé est source d'échecs HeadBucket ; MinIO reste configurable.
-- Table créée dans 20260417120000 — no-op si absente (base neuve) ; default aussi posé au CREATE.

DO $$
BEGIN
  IF to_regclass('public."PlatformProcurementS3Settings"') IS NOT NULL THEN
    ALTER TABLE "PlatformProcurementS3Settings"
      ALTER COLUMN "forcePathStyle" SET DEFAULT false;
  END IF;
END $$;
