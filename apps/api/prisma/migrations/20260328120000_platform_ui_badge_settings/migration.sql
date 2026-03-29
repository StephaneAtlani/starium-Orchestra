CREATE TABLE "PlatformUiBadgeSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "badgeConfig" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformUiBadgeSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformUiBadgeSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
