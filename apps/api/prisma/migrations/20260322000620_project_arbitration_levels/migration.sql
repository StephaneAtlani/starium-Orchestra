-- CreateEnum
CREATE TYPE "ProjectArbitrationLevelStatus" AS ENUM ('BROUILLON', 'EN_COURS', 'VALIDE', 'REFUSE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "arbitrationCodirStatus" "ProjectArbitrationLevelStatus",
ADD COLUMN     "arbitrationComiteStatus" "ProjectArbitrationLevelStatus",
ADD COLUMN     "arbitrationMetierStatus" "ProjectArbitrationLevelStatus" NOT NULL DEFAULT 'BROUILLON';

-- Rétrocompat : ancien `arbitrationStatus` → trois niveaux
UPDATE "Project" SET
  "arbitrationMetierStatus" = CASE
    WHEN "arbitrationStatus" IS NULL OR "arbitrationStatus"::text = 'DRAFT' THEN 'BROUILLON'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'TO_REVIEW' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'VALIDATED' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'REJECTED' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    ELSE 'BROUILLON'::"ProjectArbitrationLevelStatus"
  END,
  "arbitrationComiteStatus" = CASE
    WHEN "arbitrationStatus"::text = 'TO_REVIEW' THEN 'EN_COURS'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'VALIDATED' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'REJECTED' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    ELSE NULL
  END,
  "arbitrationCodirStatus" = CASE
    WHEN "arbitrationStatus"::text = 'VALIDATED' THEN 'VALIDE'::"ProjectArbitrationLevelStatus"
    WHEN "arbitrationStatus"::text = 'REJECTED' THEN 'REFUSE'::"ProjectArbitrationLevelStatus"
    ELSE NULL
  END;
