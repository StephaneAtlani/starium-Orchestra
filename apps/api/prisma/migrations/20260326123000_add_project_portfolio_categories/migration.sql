-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "portfolioCategoryId" TEXT;

-- CreateTable
CREATE TABLE "ProjectPortfolioCategory" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "slug" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectPortfolioCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPortfolioCategory_clientId_parentId_normalizedName_key"
ON "ProjectPortfolioCategory"("clientId", "parentId", "normalizedName");

-- CreateIndex
CREATE INDEX "ProjectPortfolioCategory_clientId_idx"
ON "ProjectPortfolioCategory"("clientId");

-- CreateIndex
CREATE INDEX "ProjectPortfolioCategory_clientId_parentId_idx"
ON "ProjectPortfolioCategory"("clientId", "parentId");

-- CreateIndex
CREATE INDEX "ProjectPortfolioCategory_clientId_isActive_idx"
ON "ProjectPortfolioCategory"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "Project_clientId_portfolioCategoryId_idx"
ON "Project"("clientId", "portfolioCategoryId");

-- AddForeignKey
ALTER TABLE "ProjectPortfolioCategory"
ADD CONSTRAINT "ProjectPortfolioCategory_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPortfolioCategory"
ADD CONSTRAINT "ProjectPortfolioCategory_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "ProjectPortfolioCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project"
ADD CONSTRAINT "Project_portfolioCategoryId_fkey"
FOREIGN KEY ("portfolioCategoryId") REFERENCES "ProjectPortfolioCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
