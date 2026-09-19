-- CreateEnum
CREATE TYPE "ProcedureTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ProcedureTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "categoryId" TEXT,
    "status" "ProcedureTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "outlineJson" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedureTemplate_clientId_status_idx" ON "ProcedureTemplate"("clientId", "status");

-- CreateIndex
CREATE INDEX "ProcedureTemplate_clientId_updatedAt_idx" ON "ProcedureTemplate"("clientId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProcedureTemplate_clientId_categoryId_idx" ON "ProcedureTemplate"("clientId", "categoryId");

-- AddForeignKey
ALTER TABLE "ProcedureTemplate" ADD CONSTRAINT "ProcedureTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureTemplate" ADD CONSTRAINT "ProcedureTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProcedureCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
