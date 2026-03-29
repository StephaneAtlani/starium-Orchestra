-- Surcouchages badges UI par client (libellés / tons / entrées custom).
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "uiBadgeConfig" JSONB;
