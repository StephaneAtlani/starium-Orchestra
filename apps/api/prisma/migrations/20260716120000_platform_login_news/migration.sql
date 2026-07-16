-- Message d'actualité sur l'écran de connexion (admin plateforme).
CREATE TABLE "PlatformLoginNews" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformLoginNews_pkey" PRIMARY KEY ("id")
);
