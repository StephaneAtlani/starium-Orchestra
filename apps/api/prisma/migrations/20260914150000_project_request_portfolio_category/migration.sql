-- AlterTable
ALTER TABLE "ProjectRequest" ADD COLUMN "portfolioCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "ProjectRequest_clientId_portfolioCategoryId_idx" ON "ProjectRequest"("clientId", "portfolioCategoryId");

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_portfolioCategoryId_fkey" FOREIGN KEY ("portfolioCategoryId") REFERENCES "ProjectPortfolioCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
