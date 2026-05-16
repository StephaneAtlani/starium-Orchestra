-- RFC-ACL-022 — feature flags scopés par client (par défaut désactivés)
CREATE TABLE "ClientFeatureFlag" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientFeatureFlag_clientId_flagKey_key" ON "ClientFeatureFlag"("clientId", "flagKey");

CREATE INDEX "ClientFeatureFlag_clientId_idx" ON "ClientFeatureFlag"("clientId");

ALTER TABLE "ClientFeatureFlag" ADD CONSTRAINT "ClientFeatureFlag_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
