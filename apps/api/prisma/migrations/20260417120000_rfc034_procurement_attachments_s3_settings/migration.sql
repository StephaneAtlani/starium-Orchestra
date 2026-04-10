-- RFC-034 Phase 1 — GED procurement + settings S3 plateforme

-- CreateEnum
CREATE TYPE "ProcurementAttachmentCategory" AS ENUM ('QUOTE_PDF', 'ORDER_CONFIRMATION', 'INVOICE', 'AMENDMENT', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcurementAttachmentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcurementStorageType" AS ENUM ('STARIUM', 'EXTERNAL', 'MICROSOFT');

-- CreateTable
CREATE TABLE "PlatformProcurementS3Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "region" TEXT,
    "accessKey" TEXT,
    "secretKeyEncrypted" TEXT,
    "bucket" TEXT,
    "useSsl" BOOLEAN NOT NULL DEFAULT true,
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformProcurementS3Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementAttachment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceId" TEXT,
    "name" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "category" "ProcurementAttachmentCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ProcurementAttachmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageType" "ProcurementStorageType" NOT NULL DEFAULT 'STARIUM',
    "storageBucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ProcurementAttachment_pkey" PRIMARY KEY ("id")
);

-- XOR : exactement un parent PO ou facture
ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_parent_xor" CHECK (
    (CASE WHEN "purchaseOrderId" IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN "invoiceId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

CREATE INDEX "ProcurementAttachment_clientId_idx" ON "ProcurementAttachment"("clientId");
CREATE INDEX "ProcurementAttachment_purchaseOrderId_idx" ON "ProcurementAttachment"("purchaseOrderId");
CREATE INDEX "ProcurementAttachment_invoiceId_idx" ON "ProcurementAttachment"("invoiceId");
CREATE INDEX "ProcurementAttachment_clientId_purchaseOrderId_idx" ON "ProcurementAttachment"("clientId", "purchaseOrderId");
CREATE INDEX "ProcurementAttachment_clientId_invoiceId_idx" ON "ProcurementAttachment"("clientId", "invoiceId");

ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
