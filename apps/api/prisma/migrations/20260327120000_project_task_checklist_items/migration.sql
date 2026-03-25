-- CreateTable
CREATE TABLE "ProjectTaskChecklistItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectTaskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannerChecklistItemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTaskChecklistItem_clientId_idx" ON "ProjectTaskChecklistItem"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTaskChecklistItem_projectId_idx" ON "ProjectTaskChecklistItem"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTaskChecklistItem_projectTaskId_idx" ON "ProjectTaskChecklistItem"("projectTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTaskChecklistItem_projectTaskId_plannerChecklistItemKey_key" ON "ProjectTaskChecklistItem"("projectTaskId", "plannerChecklistItemKey");

-- AddForeignKey
ALTER TABLE "ProjectTaskChecklistItem" ADD CONSTRAINT "ProjectTaskChecklistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskChecklistItem" ADD CONSTRAINT "ProjectTaskChecklistItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskChecklistItem" ADD CONSTRAINT "ProjectTaskChecklistItem_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
