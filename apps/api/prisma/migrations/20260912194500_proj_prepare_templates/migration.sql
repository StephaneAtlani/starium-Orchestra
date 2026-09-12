-- Atelier Préparer — modèles ODJ client-scopés
CREATE TABLE IF NOT EXISTS "project_review_prepare_templates" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_review_prepare_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "project_review_prepare_templates_clientId_typeCode_idx"
  ON "project_review_prepare_templates"("clientId", "typeCode");

ALTER TABLE "project_review_prepare_templates"
  ADD CONSTRAINT "project_review_prepare_templates_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
