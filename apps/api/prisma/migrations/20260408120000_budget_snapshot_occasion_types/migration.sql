-- CreateTable
CREATE TABLE "BudgetSnapshotOccasionType" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetSnapshotOccasionType_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BudgetSnapshot" ADD COLUMN "occasionTypeId" TEXT;

-- CreateIndex
CREATE INDEX "BudgetSnapshotOccasionType_clientId_isActive_sortOrder_idx" ON "BudgetSnapshotOccasionType"("clientId", "isActive", "sortOrder");

-- ForeignKeys
ALTER TABLE "BudgetSnapshotOccasionType" ADD CONSTRAINT "BudgetSnapshotOccasionType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_occasionTypeId_fkey" FOREIGN KEY ("occasionTypeId") REFERENCES "BudgetSnapshotOccasionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BudgetSnapshot_occasionTypeId_idx" ON "BudgetSnapshot"("occasionTypeId");

-- Unicité code : global (clientId IS NULL) vs par client (PostgreSQL : UNIQUE (clientId, code) autorise plusieurs NULL)
CREATE UNIQUE INDEX "BudgetSnapshotOccasionType_global_code_key"
  ON "BudgetSnapshotOccasionType" ("code")
  WHERE "clientId" IS NULL;

CREATE UNIQUE INDEX "BudgetSnapshotOccasionType_client_code_key"
  ON "BudgetSnapshotOccasionType" ("clientId", "code")
  WHERE "clientId" IS NOT NULL;
