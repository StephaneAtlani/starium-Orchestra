-- RFC-PROJ-INT-016: metadata technique pour sync bidirectionnelle Planner <-> Starium
ALTER TABLE "ProjectTaskMicrosoftSync"
ADD COLUMN "lastPullFromMicrosoftAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedPlannerEtag" TEXT,
ADD COLUMN "lastSyncedTaskUpdatedAt" TIMESTAMP(3);
