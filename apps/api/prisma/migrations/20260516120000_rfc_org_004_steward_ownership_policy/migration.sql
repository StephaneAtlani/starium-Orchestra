-- RFC-ORG-004 — steward, politique obligation ownership

CREATE TYPE "OrgOwnershipPolicyMode" AS ENUM ('ADVISORY', 'REQUIRED_ON_CREATE', 'REQUIRED_ON_ACTIVATE');

CREATE TABLE "ClientOrgOwnershipPolicy" (
    "clientId" TEXT NOT NULL,
    "mode" "OrgOwnershipPolicyMode" NOT NULL DEFAULT 'ADVISORY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrgOwnershipPolicy_pkey" PRIMARY KEY ("clientId")
);

ALTER TABLE "ClientOrgOwnershipPolicy" ADD CONSTRAINT "ClientOrgOwnershipPolicy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "Project_clientId_stewardResourceId_idx" ON "Project"("clientId", "stewardResourceId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Budget" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "Budget_clientId_stewardResourceId_idx" ON "Budget"("clientId", "stewardResourceId");
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BudgetLine" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "BudgetLine_clientId_stewardResourceId_idx" ON "BudgetLine"("clientId", "stewardResourceId");
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "Supplier_clientId_stewardResourceId_idx" ON "Supplier"("clientId", "stewardResourceId");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierContract" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "SupplierContract_clientId_stewardResourceId_idx" ON "SupplierContract"("clientId", "stewardResourceId");
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrategicObjective" ADD COLUMN "stewardResourceId" TEXT;
CREATE INDEX "StrategicObjective_clientId_stewardResourceId_idx" ON "StrategicObjective"("clientId", "stewardResourceId");
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_stewardResourceId_fkey" FOREIGN KEY ("stewardResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
