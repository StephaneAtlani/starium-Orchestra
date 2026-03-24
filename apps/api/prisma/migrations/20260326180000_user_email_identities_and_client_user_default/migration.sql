-- CreateTable
CREATE TABLE "UserEmailIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "displayName" TEXT,
    "replyToEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmailIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmailIdentity_userId_emailNormalized_key" ON "UserEmailIdentity"("userId", "emailNormalized");

-- CreateIndex
CREATE INDEX "UserEmailIdentity_userId_idx" ON "UserEmailIdentity"("userId");

-- AddForeignKey
ALTER TABLE "UserEmailIdentity" ADD CONSTRAINT "UserEmailIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: une identité par utilisateur (email de connexion)
INSERT INTO "UserEmailIdentity" ("id", "userId", "email", "emailNormalized", "displayName", "replyToEmail", "isVerified", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "email",
  lower(trim("email")),
  NULL,
  NULL,
  true,
  true,
  "createdAt",
  "updatedAt"
FROM "User";

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN "defaultEmailIdentityId" TEXT;

-- Renseigner le défaut par client avec une identité du même user (après backfill : une seule)
UPDATE "ClientUser" cu
SET "defaultEmailIdentityId" = (
  SELECT uei."id" FROM "UserEmailIdentity" uei WHERE uei."userId" = cu."userId" LIMIT 1
);

-- CreateIndex
CREATE INDEX "ClientUser_defaultEmailIdentityId_idx" ON "ClientUser"("defaultEmailIdentityId");

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_defaultEmailIdentityId_fkey" FOREIGN KEY ("defaultEmailIdentityId") REFERENCES "UserEmailIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
