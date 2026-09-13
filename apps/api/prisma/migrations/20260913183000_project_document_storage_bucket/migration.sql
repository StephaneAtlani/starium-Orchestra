-- RFC-PROJ-DOC-002 — bucket documents client (LOCAL/S3 plateforme) pour ProjectDocument STARIUM
ALTER TABLE "ProjectDocument" ADD COLUMN IF NOT EXISTS "storageBucket" TEXT;
