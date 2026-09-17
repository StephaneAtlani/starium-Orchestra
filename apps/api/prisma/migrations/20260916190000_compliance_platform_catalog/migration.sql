-- Catalogue conformité plateforme : clientId nullable + indexes d'unicité partiels.

ALTER TABLE "ComplianceFramework" DROP CONSTRAINT IF EXISTS "ComplianceFramework_clientId_fkey";
DROP INDEX IF EXISTS "ComplianceFramework_clientId_name_version_key";

ALTER TABLE "ComplianceFramework" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "ComplianceFramework" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "ComplianceFramework"
  ADD CONSTRAINT "ComplianceFramework_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unicité instance client
CREATE UNIQUE INDEX "ComplianceFramework_client_name_version_key"
  ON "ComplianceFramework" ("clientId", "name", "version")
  WHERE "clientId" IS NOT NULL;

-- Unicité catalogue plateforme
CREATE UNIQUE INDEX "ComplianceFramework_platform_name_version_key"
  ON "ComplianceFramework" ("name", "version")
  WHERE "clientId" IS NULL;

CREATE INDEX IF NOT EXISTS "ComplianceFramework_clientId_isActive_idx"
  ON "ComplianceFramework" ("clientId", "isActive");
