-- CreateTable
CREATE TABLE "SupplierContractKindType" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContractKindType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierContractKindType_clientId_isActive_sortOrder_idx" ON "SupplierContractKindType"("clientId", "isActive", "sortOrder");

ALTER TABLE "SupplierContractKindType" ADD CONSTRAINT "SupplierContractKindType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SupplierContractKindType_global_code_key"
  ON "SupplierContractKindType" ("code")
  WHERE "clientId" IS NULL;

CREATE UNIQUE INDEX "SupplierContractKindType_client_code_key"
  ON "SupplierContractKindType" ("clientId", "code")
  WHERE "clientId" IS NOT NULL;

-- Enum -> code texte (valeurs existantes inchangées)
ALTER TABLE "SupplierContract" ALTER COLUMN "kind" TYPE VARCHAR(64) USING ("kind"::text);

DROP TYPE "SupplierContractKind";
