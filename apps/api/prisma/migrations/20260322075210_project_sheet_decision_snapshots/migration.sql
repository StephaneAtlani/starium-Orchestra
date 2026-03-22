-- CreateEnum
CREATE TYPE "ProjectSheetDecisionLevel" AS ENUM ('METIER', 'COMITE', 'CODIR');

-- CreateTable
CREATE TABLE "ProjectSheetDecisionSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "decisionLevel" "ProjectSheetDecisionLevel" NOT NULL,
    "sheetPayload" JSONB NOT NULL,

    CONSTRAINT "ProjectSheetDecisionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSheetDecisionSnapshot_clientId_projectId_createdAt_idx" ON "ProjectSheetDecisionSnapshot"("clientId", "projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectSheetDecisionSnapshot_projectId_createdAt_idx" ON "ProjectSheetDecisionSnapshot"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectSheetDecisionSnapshot" ADD CONSTRAINT "ProjectSheetDecisionSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSheetDecisionSnapshot" ADD CONSTRAINT "ProjectSheetDecisionSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSheetDecisionSnapshot" ADD CONSTRAINT "ProjectSheetDecisionSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
