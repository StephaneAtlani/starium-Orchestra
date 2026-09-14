-- RFC-PROJ-INTAKE-002 — circuit configurable, journal, champs CDC

-- Statuts
ALTER TYPE "ProjectRequestStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ProjectRequestStatus" ADD VALUE IF NOT EXISTS 'IN_CYCLE';
ALTER TYPE "ProjectRequestStatus" ADD VALUE IF NOT EXISTS 'POSTPONED';

-- Nouveaux enums
DO $$ BEGIN
  CREATE TYPE "ProjectRequestType" AS ENUM (
    'TRANSFORMATION',
    'INFRASTRUCTURE',
    'REGULATORY',
    'PRODUCT',
    'EVOLUTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectRequestPriorityRequested" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectRequestInstructionOpinion" AS ENUM ('FAVORABLE', 'RESERVED', 'UNFAVORABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectRequestCircuitStep" AS ENUM (
    'SUBMISSION',
    'N1',
    'INSTRUCTION',
    'ARBITRATION',
    'PROJECT_CREATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectRequestArbitrationInstance" AS ENUM ('COPIL', 'CODIR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ProjectRequest columns
ALTER TABLE "ProjectRequest"
  ADD COLUMN IF NOT EXISTS "referenceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "type" "ProjectRequestType",
  ADD COLUMN IF NOT EXISTS "requestingDirection" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "priorityRequested" "ProjectRequestPriorityRequested",
  ADD COLUMN IF NOT EXISTS "estimatedEffortDays" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "desiredDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "retainedBudget" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "retainedEffortDays" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "instructionOpinion" "ProjectRequestInstructionOpinion",
  ADD COLUMN IF NOT EXISTS "instructionSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "failedAtStep" "ProjectRequestCircuitStep",
  ADD COLUMN IF NOT EXISTS "arbitrationInstance" "ProjectRequestArbitrationInstance",
  ADD COLUMN IF NOT EXISTS "meetingRef" TEXT,
  ADD COLUMN IF NOT EXISTS "agendaItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingLabel" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRequest_clientId_referenceCode_key"
  ON "ProjectRequest"("clientId", "referenceCode");

CREATE INDEX IF NOT EXISTS "ProjectRequest_clientId_type_idx"
  ON "ProjectRequest"("clientId", "type");

DO $$ BEGIN
  ALTER TABLE "ProjectRequest"
    ADD CONSTRAINT "ProjectRequest_sponsorUserId_fkey"
    FOREIGN KEY ("sponsorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workflow settings CDC
ALTER TABLE "ProjectRequestWorkflowSettings"
  ADD COLUMN IF NOT EXISTS "copilThresholdAmount" DECIMAL(18,2) NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS "codirThresholdAmount" DECIMAL(18,2) NOT NULL DEFAULT 250000,
  ADD COLUMN IF NOT EXISTS "instructionSlaBusinessDays" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "requireN1Validation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "requirePmoInstruction" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "autoCreateProjectOnApproval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "exemptRequestTypes" "ProjectRequestType"[] NOT NULL DEFAULT ARRAY['REGULATORY']::"ProjectRequestType"[],
  ADD COLUMN IF NOT EXISTS "configUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "configUpdatedByUserId" TEXT;

DO $$ BEGIN
  ALTER TABLE "ProjectRequestWorkflowSettings"
    ADD CONSTRAINT "ProjectRequestWorkflowSettings_configUpdatedByUserId_fkey"
    FOREIGN KEY ("configUpdatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Journal append-only
CREATE TABLE IF NOT EXISTS "ProjectRequestJournalEntry" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectRequestId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "authorLabel" TEXT NOT NULL,
  "authorUserId" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRequestJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectRequestJournalEntry_clientId_projectRequestId_idx"
  ON "ProjectRequestJournalEntry"("clientId", "projectRequestId");

CREATE INDEX IF NOT EXISTS "ProjectRequestJournalEntry_projectRequestId_at_idx"
  ON "ProjectRequestJournalEntry"("projectRequestId", "at");

DO $$ BEGIN
  ALTER TABLE "ProjectRequestJournalEntry"
    ADD CONSTRAINT "ProjectRequestJournalEntry_projectRequestId_fkey"
    FOREIGN KEY ("projectRequestId") REFERENCES "ProjectRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectRequestJournalEntry"
    ADD CONSTRAINT "ProjectRequestJournalEntry_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
