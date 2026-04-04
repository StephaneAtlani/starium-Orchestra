-- CreateEnum
CREATE TYPE "TimesheetMonthStatus" AS ENUM ('OPEN', 'SUBMITTED');

-- CreateTable
CREATE TABLE "ResourceTimesheetMonth" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "status" "TimesheetMonthStatus" NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceTimesheetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceTimesheetMonth_clientId_resourceId_yearMonth_key" ON "ResourceTimesheetMonth"("clientId", "resourceId", "yearMonth");

-- CreateIndex
CREATE INDEX "ResourceTimesheetMonth_clientId_resourceId_idx" ON "ResourceTimesheetMonth"("clientId", "resourceId");

-- AddForeignKey
ALTER TABLE "ResourceTimesheetMonth" ADD CONSTRAINT "ResourceTimesheetMonth_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTimesheetMonth" ADD CONSTRAINT "ResourceTimesheetMonth_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
