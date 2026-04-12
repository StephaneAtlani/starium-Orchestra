-- AWS S3 public : path-style forcé est source d'échecs HeadBucket ; MinIO reste configurable explicitement.
ALTER TABLE "PlatformProcurementS3Settings" ALTER COLUMN "forcePathStyle" SET DEFAULT false;
