-- RFC-036 — SupplierContract + ContractAttachment

CREATE TYPE "SupplierContractKind" AS ENUM ('FRAMEWORK', 'LICENSE_SAAS', 'SERVICES', 'MAINTENANCE', 'OTHER');

CREATE TYPE "SupplierContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'NOTICE', 'EXPIRED', 'TERMINATED');

CREATE TYPE "SupplierContractRenewalMode" AS ENUM ('NONE', 'TACIT', 'EXPLICIT');

CREATE TYPE "ContractAttachmentCategory" AS ENUM ('CONTRACT_PDF', 'AMENDMENT', 'SLA', 'OTHER');

CREATE TABLE "SupplierContract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SupplierContractKind" NOT NULL,
    "status" "SupplierContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "effectiveStart" TIMESTAMP(3) NOT NULL,
    "effectiveEnd" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "renewalMode" "SupplierContractRenewalMode" NOT NULL DEFAULT 'NONE',
    "noticePeriodDays" INTEGER,
    "renewalTermMonths" INTEGER,
    "currency" VARCHAR(3) NOT NULL,
    "annualValue" DECIMAL(18,2),
    "totalCommittedValue" DECIMAL(18,2),
    "billingFrequency" VARCHAR(32),
    "description" VARCHAR(4000),
    "internalNotes" VARCHAR(4000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractAttachment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supplierContractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "category" "ContractAttachmentCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ProcurementAttachmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageType" "ProcurementStorageType" NOT NULL DEFAULT 'STARIUM',
    "storageBucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ContractAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierContract_clientId_reference_key" ON "SupplierContract"("clientId", "reference");

CREATE INDEX "SupplierContract_clientId_idx" ON "SupplierContract"("clientId");
CREATE INDEX "SupplierContract_clientId_supplierId_idx" ON "SupplierContract"("clientId", "supplierId");
CREATE INDEX "SupplierContract_clientId_status_idx" ON "SupplierContract"("clientId", "status");
CREATE INDEX "SupplierContract_clientId_effectiveEnd_idx" ON "SupplierContract"("clientId", "effectiveEnd");

CREATE INDEX "ContractAttachment_clientId_idx" ON "ContractAttachment"("clientId");
CREATE INDEX "ContractAttachment_supplierContractId_idx" ON "ContractAttachment"("supplierContractId");
CREATE INDEX "ContractAttachment_clientId_supplierContractId_idx" ON "ContractAttachment"("clientId", "supplierContractId");

ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_supplierContractId_fkey" FOREIGN KEY ("supplierContractId") REFERENCES "SupplierContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
