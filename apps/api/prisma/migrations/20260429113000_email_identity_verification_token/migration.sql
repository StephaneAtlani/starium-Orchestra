-- Token de vérification d’identités e-mail secondaires.
-- Stockage token uniquement en hash (champ tokenHash unique).

CREATE TABLE "EmailIdentityVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailIdentityId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailIdentityVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailIdentityVerificationToken_tokenHash_key"
  ON "EmailIdentityVerificationToken"("tokenHash");

CREATE INDEX "EmailIdentityVerificationToken_userId_createdAt_idx"
  ON "EmailIdentityVerificationToken"("userId","createdAt");

CREATE INDEX "EmailIdentityVerificationToken_emailIdentityId_createdAt_idx"
  ON "EmailIdentityVerificationToken"("emailIdentityId","createdAt");

CREATE INDEX "EmailIdentityVerificationToken_emailIdentityId_expiresAt_idx"
  ON "EmailIdentityVerificationToken"("emailIdentityId","expiresAt");

ALTER TABLE "EmailIdentityVerificationToken"
  ADD CONSTRAINT "EmailIdentityVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "EmailIdentityVerificationToken"
  ADD CONSTRAINT "EmailIdentityVerificationToken_emailIdentityId_fkey"
  FOREIGN KEY ("emailIdentityId") REFERENCES "UserEmailIdentity"(id) ON DELETE CASCADE;

