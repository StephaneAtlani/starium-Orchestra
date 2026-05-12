-- RFC-ORG-002 — lien optionnel ClientUser ↔ Resource (HUMAN)

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN "resourceId" TEXT;

-- CreateIndex
CREATE INDEX "ClientUser_clientId_resourceId_idx" ON "ClientUser"("clientId", "resourceId");

-- CreateIndex (unique partial semantics: multiple NULLs allowed in PostgreSQL)
CREATE UNIQUE INDEX "ClientUser_resourceId_key" ON "ClientUser"("resourceId");

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
