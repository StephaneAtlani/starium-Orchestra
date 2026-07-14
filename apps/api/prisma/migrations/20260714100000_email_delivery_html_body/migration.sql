-- Corps HTML async (compte rendu point projet, etc.)
ALTER TABLE "EmailDelivery" ADD COLUMN IF NOT EXISTS "emailBodyHtml" TEXT;
