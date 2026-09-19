-- AlterEnum: PENDING_VALIDATION (avant PUBLISHED dans le cycle métier)
ALTER TYPE "ProcedureStatus" ADD VALUE IF NOT EXISTS 'PENDING_VALIDATION';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProcedureStakeholderRole" AS ENUM ('EDITOR', 'REVIEWER', 'VALIDATOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcedureStakeholder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProcedureStakeholderRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureStakeholder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcedureStakeholder_procedureId_userId_role_key" ON "ProcedureStakeholder"("procedureId", "userId", "role");
CREATE INDEX IF NOT EXISTS "ProcedureStakeholder_clientId_procedureId_idx" ON "ProcedureStakeholder"("clientId", "procedureId");
CREATE INDEX IF NOT EXISTS "ProcedureStakeholder_clientId_userId_idx" ON "ProcedureStakeholder"("clientId", "userId");
CREATE INDEX IF NOT EXISTS "ProcedureStakeholder_procedureId_role_idx" ON "ProcedureStakeholder"("procedureId", "role");

DO $$ BEGIN
  ALTER TABLE "ProcedureStakeholder" ADD CONSTRAINT "ProcedureStakeholder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProcedureStakeholder" ADD CONSTRAINT "ProcedureStakeholder_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProcedureStakeholder" ADD CONSTRAINT "ProcedureStakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
