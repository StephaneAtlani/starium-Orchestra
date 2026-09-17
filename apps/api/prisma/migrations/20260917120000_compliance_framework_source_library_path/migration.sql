-- Chemin source CISO Assistant pour dédoublonner les imports catalogue plateforme.
ALTER TABLE "ComplianceFramework" ADD COLUMN IF NOT EXISTS "sourceLibraryPath" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceFramework_sourceLibraryPath_key"
  ON "ComplianceFramework" ("sourceLibraryPath");
