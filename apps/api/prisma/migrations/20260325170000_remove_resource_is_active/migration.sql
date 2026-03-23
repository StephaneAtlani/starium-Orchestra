-- DropIndex
DROP INDEX IF EXISTS "Resource_clientId_isActive_idx";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "isActive";
