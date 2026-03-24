-- CreateTable
CREATE TABLE "ProjectTag" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTagAssignment" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTag_clientId_name_key" ON "ProjectTag"("clientId", "name");

-- CreateIndex
CREATE INDEX "ProjectTag_clientId_idx" ON "ProjectTag"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTagAssignment_projectId_tagId_key" ON "ProjectTagAssignment"("projectId", "tagId");

-- CreateIndex
CREATE INDEX "ProjectTagAssignment_clientId_idx" ON "ProjectTagAssignment"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTagAssignment_projectId_idx" ON "ProjectTagAssignment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTagAssignment_tagId_idx" ON "ProjectTagAssignment"("tagId");

-- AddForeignKey
ALTER TABLE "ProjectTag"
ADD CONSTRAINT "ProjectTag_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTagAssignment"
ADD CONSTRAINT "ProjectTagAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTagAssignment"
ADD CONSTRAINT "ProjectTagAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTagAssignment"
ADD CONSTRAINT "ProjectTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProjectTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
