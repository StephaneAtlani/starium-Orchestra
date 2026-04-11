-- RFC-035 — dual backend procurement (local + S3). Default S3 for existing deployments.
CREATE TYPE "ProcurementStorageDriver" AS ENUM ('LOCAL', 'S3');

ALTER TABLE "PlatformProcurementS3Settings" ADD COLUMN "storageDriver" "ProcurementStorageDriver" NOT NULL DEFAULT 'S3';
ALTER TABLE "PlatformProcurementS3Settings" ADD COLUMN "localRoot" TEXT;
