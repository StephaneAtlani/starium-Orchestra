-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('CLIENT', 'GLOBAL');

-- AlterTable
ALTER TABLE "Role"
ADD COLUMN "scope" "RoleScope" NOT NULL DEFAULT 'CLIENT',
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Role_scope_idx" ON "Role"("scope");

-- CreateIndex
CREATE INDEX "Role_name_idx" ON "Role"("name");

-- CreateIndex (global name uniqueness among GLOBAL roles only)
CREATE UNIQUE INDEX "Role_global_name_unique_idx"
ON "Role"("name")
WHERE "scope" = 'GLOBAL';

-- Check scope/client consistency
ALTER TABLE "Role"
ADD CONSTRAINT "Role_scope_clientId_consistency_check"
CHECK (
  ("scope" = 'GLOBAL' AND "clientId" IS NULL)
  OR
  ("scope" = 'CLIENT' AND "clientId" IS NOT NULL)
);
