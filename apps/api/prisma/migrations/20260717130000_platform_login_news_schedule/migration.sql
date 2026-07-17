-- Fenêtre d'affichage optionnelle pour l'actualité écran de connexion.
ALTER TABLE "PlatformLoginNews"
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3);
