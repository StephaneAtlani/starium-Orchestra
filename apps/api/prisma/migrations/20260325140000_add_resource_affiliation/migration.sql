-- CreateEnum
CREATE TYPE "ResourceAffiliation" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "affiliation" "ResourceAffiliation";
