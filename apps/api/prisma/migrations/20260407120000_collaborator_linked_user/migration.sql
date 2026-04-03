-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_clientId_userId_key" ON "Collaborator"("clientId", "userId");

-- CreateIndex
CREATE INDEX "Collaborator_userId_idx" ON "Collaborator"("userId");

-- Backfill : même email qu’un membre client sur ce client
UPDATE "Collaborator" c
SET "userId" = u.id
FROM "ClientUser" cu
JOIN "User" u ON u.id = cu."userId"
WHERE c."clientId" = cu."clientId"
  AND c."email" IS NOT NULL
  AND LOWER(TRIM(c."email")) = LOWER(TRIM(u."email"))
  AND c."userId" IS NULL;
