-- Ajoute la colonne JSON (liste de KPI) et migre l’ancien texte unique en tableau à un élément.
ALTER TABLE "Project" ADD COLUMN "businessSuccessKpis" JSONB;

UPDATE "Project"
SET "businessSuccessKpis" = to_jsonb(ARRAY[trim("businessSuccessKpi")]::text[])
WHERE "businessSuccessKpi" IS NOT NULL AND trim("businessSuccessKpi") <> '';

ALTER TABLE "Project" DROP COLUMN "businessSuccessKpi";
