-- CreateEnum
CREATE TYPE "StrategicObjectiveStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategicLinkType" AS ENUM ('PROJECT', 'BUDGET', 'RISK');

-- CreateTable
CREATE TABLE "StrategicVision" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "horizonLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicVision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicAxis" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "visionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicAxis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicObjective" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "axisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerLabel" TEXT,
    "status" "StrategicObjectiveStatus" NOT NULL DEFAULT 'ON_TRACK',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "linkType" "StrategicLinkType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabelSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategicVision_clientId_idx" ON "StrategicVision"("clientId");

-- CreateIndex
CREATE INDEX "StrategicVision_clientId_isActive_idx" ON "StrategicVision"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "StrategicAxis_clientId_idx" ON "StrategicAxis"("clientId");

-- CreateIndex
CREATE INDEX "StrategicAxis_clientId_visionId_idx" ON "StrategicAxis"("clientId", "visionId");

-- CreateIndex
CREATE INDEX "StrategicObjective_clientId_idx" ON "StrategicObjective"("clientId");

-- CreateIndex
CREATE INDEX "StrategicObjective_clientId_axisId_idx" ON "StrategicObjective"("clientId", "axisId");

-- CreateIndex
CREATE INDEX "StrategicObjective_clientId_status_idx" ON "StrategicObjective"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StrategicLink_objectiveId_linkType_targetId_key" ON "StrategicLink"("objectiveId", "linkType", "targetId");

-- CreateIndex
CREATE INDEX "StrategicLink_clientId_idx" ON "StrategicLink"("clientId");

-- CreateIndex
CREATE INDEX "StrategicLink_clientId_objectiveId_idx" ON "StrategicLink"("clientId", "objectiveId");

-- CreateIndex
CREATE INDEX "StrategicLink_clientId_linkType_idx" ON "StrategicLink"("clientId", "linkType");

-- AddForeignKey
ALTER TABLE "StrategicVision" ADD CONSTRAINT "StrategicVision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_visionId_fkey" FOREIGN KEY ("visionId") REFERENCES "StrategicVision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicObjective" ADD CONSTRAINT "StrategicObjective_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "StrategicAxis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicLink" ADD CONSTRAINT "StrategicLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicLink" ADD CONSTRAINT "StrategicLink_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategicObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
