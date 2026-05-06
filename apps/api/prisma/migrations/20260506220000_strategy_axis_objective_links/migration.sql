-- CreateTable
CREATE TABLE "StrategicDirectionStrategyAxisLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategicAxisId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicDirectionStrategyAxisLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicDirectionStrategyObjectiveLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategicObjectiveId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicDirectionStrategyObjectiveLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategicDirectionStrategyAxisLink_clientId_idx" ON "StrategicDirectionStrategyAxisLink"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategicDirectionStrategyAxisLink_strategyId_strategicAxisId_key" ON "StrategicDirectionStrategyAxisLink"("strategyId", "strategicAxisId");

-- CreateIndex
CREATE INDEX "StrategicDirectionStrategyObjectiveLink_clientId_idx" ON "StrategicDirectionStrategyObjectiveLink"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategicDirectionStrategyObjectiveLink_strategyId_strategicObjectiveId_key" ON "StrategicDirectionStrategyObjectiveLink"("strategyId", "strategicObjectiveId");

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyAxisLink" ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyAxisLink" ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyAxisLink" ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_strategicAxisId_fkey" FOREIGN KEY ("strategicAxisId") REFERENCES "StrategicAxis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyObjectiveLink" ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyObjectiveLink" ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicDirectionStrategyObjectiveLink" ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_strategicObjectiveId_fkey" FOREIGN KEY ("strategicObjectiveId") REFERENCES "StrategicObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
