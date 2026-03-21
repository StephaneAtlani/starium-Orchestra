-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('PROJECT', 'ACTIVITY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "kind" "ProjectKind" NOT NULL DEFAULT 'PROJECT';

-- CreateIndex
CREATE INDEX "Project_clientId_kind_idx" ON "Project"("clientId", "kind");
