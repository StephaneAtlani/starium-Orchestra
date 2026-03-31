-- Buckets planning (Starium / miroir Planner) + option lien Microsoft

ALTER TABLE "ProjectMicrosoftLink" ADD COLUMN "useMicrosoftPlannerBuckets" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProjectTaskBucket" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannerBucketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskBucket_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectTask" ADD COLUMN "bucketId" TEXT;

CREATE UNIQUE INDEX "ProjectTaskBucket_projectId_plannerBucketId_key" ON "ProjectTaskBucket"("projectId", "plannerBucketId");
CREATE INDEX "ProjectTaskBucket_clientId_idx" ON "ProjectTaskBucket"("clientId");
CREATE INDEX "ProjectTaskBucket_projectId_idx" ON "ProjectTaskBucket"("projectId");

CREATE INDEX "ProjectTask_bucketId_idx" ON "ProjectTask"("bucketId");

ALTER TABLE "ProjectTaskBucket" ADD CONSTRAINT "ProjectTaskBucket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTaskBucket" ADD CONSTRAINT "ProjectTaskBucket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "ProjectTaskBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
