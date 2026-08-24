-- RFC-034 Phase 1 — GED procurement + settings S3 plateforme
-- Inclut les colonnes RFC-035 (storageDriver / localRoot) : la migration
-- 20260411120000_rfc035 tourne avant cette CREATE TABLE sur une base neuve.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProcurementAttachmentCategory" AS ENUM ('QUOTE_PDF', 'ORDER_CONFIRMATION', 'INVOICE', 'AMENDMENT', 'CORRESPONDENCE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcurementAttachmentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcurementStorageType" AS ENUM ('STARIUM', 'EXTERNAL', 'MICROSOFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcurementStorageDriver" AS ENUM ('LOCAL', 'S3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (schéma final aligné schema.prisma : forcePathStyle default false + dual storage)
CREATE TABLE IF NOT EXISTS "PlatformProcurementS3Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "storageDriver" "ProcurementStorageDriver" NOT NULL DEFAULT 'S3',
    "localRoot" TEXT,
    "endpoint" TEXT,
    "region" TEXT,
    "accessKey" TEXT,
    "secretKeyEncrypted" TEXT,
    "bucket" TEXT,
    "useSsl" BOOLEAN NOT NULL DEFAULT true,
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformProcurementS3Settings_pkey" PRIMARY KEY ("id")
);

-- Colonnes RFC-035 si la table existait déjà sans elles (drift / ordre historique)
ALTER TABLE "PlatformProcurementS3Settings"
  ADD COLUMN IF NOT EXISTS "storageDriver" "ProcurementStorageDriver" NOT NULL DEFAULT 'S3';
ALTER TABLE "PlatformProcurementS3Settings"
  ADD COLUMN IF NOT EXISTS "localRoot" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcurementAttachment" (
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
DO $$ BEGIN
  ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_parent_xor" CHECK (
      (CASE WHEN "purchaseOrderId" IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN "invoiceId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ProcurementAttachment_clientId_idx" ON "ProcurementAttachment"("clientId");
CREATE INDEX IF NOT EXISTS "ProcurementAttachment_purchaseOrderId_idx" ON "ProcurementAttachment"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "ProcurementAttachment_invoiceId_idx" ON "ProcurementAttachment"("invoiceId");
CREATE INDEX IF NOT EXISTS "ProcurementAttachment_clientId_purchaseOrderId_idx" ON "ProcurementAttachment"("clientId", "purchaseOrderId");
CREATE INDEX IF NOT EXISTS "ProcurementAttachment_clientId_invoiceId_idx" ON "ProcurementAttachment"("clientId", "invoiceId");

DO $$ BEGIN
  ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProcurementAttachment" ADD CONSTRAINT "ProcurementAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
