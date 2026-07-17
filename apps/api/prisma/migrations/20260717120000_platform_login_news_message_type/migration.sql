-- Type de message pour l'actualité écran de connexion (Information / Avertissement / Urgent).
CREATE TYPE "PlatformLoginNewsType" AS ENUM ('INFORMATION', 'WARNING', 'URGENT');

ALTER TABLE "PlatformLoginNews"
ADD COLUMN "messageType" "PlatformLoginNewsType" NOT NULL DEFAULT 'INFORMATION';
