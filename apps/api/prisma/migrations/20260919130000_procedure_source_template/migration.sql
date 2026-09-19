-- AlterTable
ALTER TABLE "Procedure" ADD COLUMN "sourceTemplateId" TEXT,
ADD COLUMN "sourceTemplateName" VARCHAR(200);

-- CreateIndex
CREATE INDEX "Procedure_clientId_sourceTemplateId_idx" ON "Procedure"("clientId", "sourceTemplateId");

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "ProcedureTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
