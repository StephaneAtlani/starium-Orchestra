-- CreateEnum
CREATE TYPE "ProjectCopilRecommendation" AS ENUM ('NOT_SET', 'POURSUIVRE', 'NE_PAS_ENGAGER', 'SOUS_RESERVE', 'REPORTER', 'AJUSTER_CADRAGE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "copilRecommendation" "ProjectCopilRecommendation" NOT NULL DEFAULT 'NOT_SET';
