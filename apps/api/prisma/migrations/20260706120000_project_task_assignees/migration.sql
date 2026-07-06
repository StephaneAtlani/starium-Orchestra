-- CreateTable
CREATE TABLE "ProjectTaskAssignee" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectTaskId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTaskAssignee_clientId_idx" ON "ProjectTaskAssignee"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTaskAssignee_projectTaskId_idx" ON "ProjectTaskAssignee"("projectTaskId");

-- CreateIndex
CREATE INDEX "ProjectTaskAssignee_resourceId_idx" ON "ProjectTaskAssignee"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTaskAssignee_clientId_projectTaskId_resourceId_key" ON "ProjectTaskAssignee"("clientId", "projectTaskId", "resourceId");

-- AddForeignKey
ALTER TABLE "ProjectTaskAssignee" ADD CONSTRAINT "ProjectTaskAssignee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskAssignee" ADD CONSTRAINT "ProjectTaskAssignee_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskAssignee" ADD CONSTRAINT "ProjectTaskAssignee_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
