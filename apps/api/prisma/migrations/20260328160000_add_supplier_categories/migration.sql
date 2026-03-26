-- RFC-FOU-026 Supplier Categories
CREATE TABLE "SupplierCategory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Supplier"
ADD COLUMN "supplierCategoryId" TEXT;

CREATE UNIQUE INDEX "SupplierCategory_clientId_normalizedName_key"
ON "SupplierCategory"("clientId", "normalizedName");

CREATE INDEX "SupplierCategory_clientId_idx" ON "SupplierCategory"("clientId");
CREATE INDEX "SupplierCategory_clientId_isActive_idx" ON "SupplierCategory"("clientId", "isActive");
CREATE INDEX "SupplierCategory_clientId_sortOrder_idx" ON "SupplierCategory"("clientId", "sortOrder");
CREATE INDEX "Supplier_supplierCategoryId_idx" ON "Supplier"("supplierCategoryId");
CREATE INDEX "Supplier_clientId_supplierCategoryId_idx" ON "Supplier"("clientId", "supplierCategoryId");

ALTER TABLE "SupplierCategory"
ADD CONSTRAINT "SupplierCategory_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_supplierCategoryId_fkey"
FOREIGN KEY ("supplierCategoryId") REFERENCES "SupplierCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
