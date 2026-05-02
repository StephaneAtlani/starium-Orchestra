-- Persist template fields for async email processing (verify link, body copy).
ALTER TABLE "EmailDelivery" ADD COLUMN "actionUrl" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "emailBodyTitle" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "emailBodyMessage" TEXT;
