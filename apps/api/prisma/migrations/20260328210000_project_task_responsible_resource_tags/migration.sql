-- Enrichissement tâche : responsable Resource (Person métier), charge estimée, tags libres
ALTER TABLE "ProjectTask" ADD COLUMN "responsibleResourceId" TEXT,
ADD COLUMN "estimatedHours" DOUBLE PRECISION,
ADD COLUMN "tags" JSONB;

ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_responsibleResourceId_fkey" FOREIGN KEY ("responsibleResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectTask_responsibleResourceId_idx" ON "ProjectTask"("responsibleResourceId");
