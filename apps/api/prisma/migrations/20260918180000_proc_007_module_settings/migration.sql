-- RFC-PROC-007 F1 — ProcedureModuleSettings (cycle + validateurs)
CREATE TABLE "ProcedureModuleSettings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "usePilotageCycle" BOOLEAN NOT NULL DEFAULT true,
    "validatorUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureModuleSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcedureModuleSettings_clientId_key" ON "ProcedureModuleSettings"("clientId");
CREATE INDEX "ProcedureModuleSettings_clientId_idx" ON "ProcedureModuleSettings"("clientId");

ALTER TABLE "ProcedureModuleSettings" ADD CONSTRAINT "ProcedureModuleSettings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
