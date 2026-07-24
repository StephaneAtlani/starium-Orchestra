-- RFC-CAPA-001 Capacity Management

CREATE TYPE "CapacitySource" AS ENUM ('CALENDAR', 'CLIENT_PARAM', 'MEMBER_EXCEPTION', 'SIRH');
CREATE TYPE "CapacityAllocationSourceType" AS ENUM ('MANUAL', 'PROJECT', 'PROJECT_RISK', 'ACTION_PLAN');

-- Composite unique for tenant-scoped FKs
CREATE UNIQUE INDEX "Resource_clientId_id_key" ON "Resource"("clientId", "id");
CREATE UNIQUE INDEX "WorkTeam_clientId_id_key" ON "WorkTeam"("clientId", "id");

ALTER TABLE "Resource" ADD COLUMN "primaryCapacityWorkTeamId" TEXT;
CREATE INDEX "Resource_clientId_primaryCapacityWorkTeamId_idx" ON "Resource"("clientId", "primaryCapacityWorkTeamId");

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_clientId_primaryCapacityWorkTeamId_fkey"
  FOREIGN KEY ("clientId", "primaryCapacityWorkTeamId")
  REFERENCES "WorkTeam"("clientId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Project" ADD COLUMN "consumesCapacity" BOOLEAN;
ALTER TABLE "ProjectRisk" ADD COLUMN "consumesCapacity" BOOLEAN;
ALTER TABLE "ActionPlan" ADD COLUMN "consumesCapacity" BOOLEAN;

CREATE TABLE "ClientMonthlyCapacity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "days" DECIMAL(8,2) NOT NULL,
    "source" "CapacitySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientMonthlyCapacity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientMonthlyCapacity_clientId_yearMonth_key" ON "ClientMonthlyCapacity"("clientId", "yearMonth");
CREATE INDEX "ClientMonthlyCapacity_clientId_idx" ON "ClientMonthlyCapacity"("clientId");

ALTER TABLE "ClientMonthlyCapacity"
  ADD CONSTRAINT "ClientMonthlyCapacity_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResourceCapacityException" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "days" DECIMAL(8,2),
    "source" "CapacitySource" NOT NULL DEFAULT 'MEMBER_EXCEPTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResourceCapacityException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceCapacityException_clientId_resourceId_yearMonth_key"
  ON "ResourceCapacityException"("clientId", "resourceId", "yearMonth");
CREATE INDEX "ResourceCapacityException_clientId_resourceId_idx"
  ON "ResourceCapacityException"("clientId", "resourceId");

ALTER TABLE "ResourceCapacityException"
  ADD CONSTRAINT "ResourceCapacityException_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceCapacityException"
  ADD CONSTRAINT "ResourceCapacityException_clientId_resourceId_fkey"
  FOREIGN KEY ("clientId", "resourceId") REFERENCES "Resource"("clientId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CapacityAllocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DECIMAL(8,2) NOT NULL,
    "comment" TEXT,
    "workTeamId" TEXT,
    "resourceId" TEXT,
    "sourceType" "CapacityAllocationSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CapacityAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CapacityAllocation_clientId_sourceType_sourceId_idx"
  ON "CapacityAllocation"("clientId", "sourceType", "sourceId");
CREATE INDEX "CapacityAllocation_clientId_workTeamId_idx" ON "CapacityAllocation"("clientId", "workTeamId");
CREATE INDEX "CapacityAllocation_clientId_resourceId_idx" ON "CapacityAllocation"("clientId", "resourceId");
CREATE INDEX "CapacityAllocation_clientId_startDate_endDate_idx"
  ON "CapacityAllocation"("clientId", "startDate", "endDate");

ALTER TABLE "CapacityAllocation"
  ADD CONSTRAINT "CapacityAllocation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CapacityAllocation"
  ADD CONSTRAINT "CapacityAllocation_clientId_workTeamId_fkey"
  FOREIGN KEY ("clientId", "workTeamId") REFERENCES "WorkTeam"("clientId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CapacityAllocation"
  ADD CONSTRAINT "CapacityAllocation_clientId_resourceId_fkey"
  FOREIGN KEY ("clientId", "resourceId") REFERENCES "Resource"("clientId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CapacityAllocationMonth" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "days" DECIMAL(8,2) NOT NULL,
    CONSTRAINT "CapacityAllocationMonth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CapacityAllocationMonth_allocationId_yearMonth_key"
  ON "CapacityAllocationMonth"("allocationId", "yearMonth");
CREATE INDEX "CapacityAllocationMonth_clientId_yearMonth_idx"
  ON "CapacityAllocationMonth"("clientId", "yearMonth");
CREATE INDEX "CapacityAllocationMonth_allocationId_idx" ON "CapacityAllocationMonth"("allocationId");

ALTER TABLE "CapacityAllocationMonth"
  ADD CONSTRAINT "CapacityAllocationMonth_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CapacityAllocationMonth"
  ADD CONSTRAINT "CapacityAllocationMonth_allocationId_fkey"
  FOREIGN KEY ("allocationId") REFERENCES "CapacityAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
