-- Add V1 functional fields for strategic direction strategy module.
ALTER TABLE "StrategicDirectionStrategy"
ADD COLUMN "title" TEXT,
ADD COLUMN "ambition" TEXT,
ADD COLUMN "context" TEXT,
ADD COLUMN "strategicPriorities" JSONB,
ADD COLUMN "expectedOutcomes" JSONB,
ADD COLUMN "kpis" JSONB,
ADD COLUMN "majorInitiatives" JSONB,
ADD COLUMN "risks" JSONB,
ADD COLUMN "ownerLabel" TEXT,
ADD COLUMN "submittedByUserId" TEXT;
