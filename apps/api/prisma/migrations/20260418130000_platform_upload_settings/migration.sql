-- CreateTable
CREATE TABLE "PlatformUploadSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxUploadBytes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUploadSettings_pkey" PRIMARY KEY ("id")
);

-- Default: 15 MiB (aligné ancienne limite pièces procurement)
INSERT INTO "PlatformUploadSettings" ("id", "maxUploadBytes")
VALUES ('default', 15728640);
