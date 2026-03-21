-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "businessBenefits" TEXT,
ADD COLUMN     "businessProblem" TEXT,
ADD COLUMN     "businessSuccessKpi" TEXT,
ADD COLUMN     "swotOpportunities" JSONB,
ADD COLUMN     "swotStrengths" JSONB,
ADD COLUMN     "swotThreats" JSONB,
ADD COLUMN     "swotWeaknesses" JSONB,
ADD COLUMN     "towsActions" JSONB;
