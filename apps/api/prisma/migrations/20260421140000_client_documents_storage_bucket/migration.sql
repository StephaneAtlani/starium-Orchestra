-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "documentsBucketName" TEXT,
ADD COLUMN     "documentsBucketProvisionedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformProcurementS3Settings" ADD COLUMN     "clientDocumentsBucketPrefix" TEXT;
