-- RFC-ORG-003 V1 — propriété organisationnelle (ownerOrgUnitId nullable)

ALTER TABLE "Project" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "Project_clientId_ownerOrgUnitId_idx" ON "Project"("clientId", "ownerOrgUnitId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Budget" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "Budget_clientId_ownerOrgUnitId_idx" ON "Budget"("clientId", "ownerOrgUnitId");
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BudgetLine" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "BudgetLine_clientId_ownerOrgUnitId_idx" ON "BudgetLine"("clientId", "ownerOrgUnitId");
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "Supplier_clientId_ownerOrgUnitId_idx" ON "Supplier"("clientId", "ownerOrgUnitId");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierContract" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "SupplierContract_clientId_ownerOrgUnitId_idx" ON "SupplierContract"("clientId", "ownerOrgUnitId");
ALTER TABLE "SupplierContract" ADD CONSTRAINT "SupplierContract_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StrategicObjective" ADD COLUMN "ownerOrgUnitId" TEXT;
CREATE INDEX "StrategicObjective_clientId_ownerOrgUnitId_idx" ON "StrategicObjective"("clientId", "ownerOrgUnitId");
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_ownerOrgUnitId_fkey" FOREIGN KEY ("ownerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
