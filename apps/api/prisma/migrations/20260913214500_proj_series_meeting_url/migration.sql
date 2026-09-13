-- RFC-PROJ-013-7 — lien visio par défaut sur les séries de points projet
ALTER TABLE "ProjectReviewSeries" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;
