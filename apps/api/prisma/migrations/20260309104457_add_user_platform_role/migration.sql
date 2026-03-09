/*
  Warnings:

  - You are about to drop the column `isPlatformAdmin` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isPlatformAdmin",
ADD COLUMN     "platformRole" "PlatformRole";
