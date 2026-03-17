-- CreateEnum
CREATE TYPE "BudgetEnvelopeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "BudgetEnvelope" ADD COLUMN     "status" "BudgetEnvelopeStatus" NOT NULL DEFAULT 'ACTIVE';
