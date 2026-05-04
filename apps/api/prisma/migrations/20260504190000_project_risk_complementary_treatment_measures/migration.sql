-- Traitement / mesures complémentaires (risque résiduel — EBIOS RM)
ALTER TABLE "ProjectRisk" ADD COLUMN IF NOT EXISTS "complementaryTreatmentMeasures" TEXT;
