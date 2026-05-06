-- Add V1 functional fields for strategic direction strategy module.
ALTER TABLE "StrategicDirectionStrategy"
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "ambition" TEXT,
ADD COLUMN IF NOT EXISTS "context" TEXT,
ADD COLUMN IF NOT EXISTS "strategicPriorities" JSONB,
ADD COLUMN IF NOT EXISTS "expectedOutcomes" JSONB,
ADD COLUMN IF NOT EXISTS "kpis" JSONB,
ADD COLUMN IF NOT EXISTS "majorInitiatives" JSONB,
ADD COLUMN IF NOT EXISTS "risks" JSONB,
ADD COLUMN IF NOT EXISTS "ownerLabel" TEXT,
ADD COLUMN IF NOT EXISTS "submittedByUserId" TEXT;
