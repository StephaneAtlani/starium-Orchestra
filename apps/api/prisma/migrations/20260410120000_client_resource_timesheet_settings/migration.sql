-- Paramètres client pour la grille temps réalisé (RFC équipe / ressources).

ALTER TABLE "Client" ADD COLUMN "timesheetIgnoreWeekendsDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN "timesheetAllowFractionAboveOne" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "timesheetDayReferenceHours" DECIMAL(5,2);
