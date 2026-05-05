-- RFC-STRAT-005: référentiel de directions stratégiques client-scopé.
CREATE TABLE "StrategicDirection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicDirection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrategicDirection_clientId_code_key" ON "StrategicDirection"("clientId", "code");
CREATE INDEX "StrategicDirection_clientId_idx" ON "StrategicDirection"("clientId");
CREATE INDEX "StrategicDirection_clientId_isActive_idx" ON "StrategicDirection"("clientId", "isActive");

ALTER TABLE "StrategicObjective"
    ADD COLUMN "directionId" TEXT;

CREATE INDEX "StrategicObjective_clientId_directionId_idx" ON "StrategicObjective"("clientId", "directionId");

ALTER TABLE "StrategicDirection"
    ADD CONSTRAINT "StrategicDirection_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategicObjective"
    ADD CONSTRAINT "StrategicObjective_directionId_fkey"
    FOREIGN KEY ("directionId") REFERENCES "StrategicDirection"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
