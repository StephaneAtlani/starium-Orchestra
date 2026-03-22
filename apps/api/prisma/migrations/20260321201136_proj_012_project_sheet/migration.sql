-- CreateEnum
CREATE TYPE "ProjectRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProjectArbitrationStatus" AS ENUM ('DRAFT', 'TO_REVIEW', 'VALIDATED', 'REJECTED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "arbitrationStatus" "ProjectArbitrationStatus",
ADD COLUMN     "businessValueScore" INTEGER,
ADD COLUMN     "estimatedCost" DECIMAL(18,2),
ADD COLUMN     "estimatedGain" DECIMAL(18,2),
ADD COLUMN     "priorityScore" DECIMAL(5,2),
ADD COLUMN     "riskLevel" "ProjectRiskLevel",
ADD COLUMN     "roi" DECIMAL(10,2),
ADD COLUMN     "strategicAlignment" INTEGER,
ADD COLUMN     "urgencyScore" INTEGER;
