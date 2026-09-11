-- RFC-PROJ-013-8 F3.1 — descentes COPIL → COPRO

ALTER TYPE "ProjectReviewAgendaItemType" ADD VALUE IF NOT EXISTS 'DECISION_DESCENT';

CREATE TYPE "ProjectReviewDescentStatus" AS ENUM ('PENDING', 'INJECTED', 'CANCELLED');

CREATE TABLE "ProjectReviewDescent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceReviewId" TEXT NOT NULL,
    "sourceDecisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "ownerUserId" TEXT,
    "targetReviewId" TEXT,
    "targetAgendaItemId" TEXT,
    "status" "ProjectReviewDescentStatus" NOT NULL DEFAULT 'PENDING',
    "injectedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReviewDescent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectReviewDescent_clientId_sourceDecisionId_key" ON "ProjectReviewDescent"("clientId", "sourceDecisionId");
CREATE INDEX "ProjectReviewDescent_clientId_projectId_status_idx" ON "ProjectReviewDescent"("clientId", "projectId", "status");
CREATE INDEX "ProjectReviewDescent_clientId_sourceReviewId_idx" ON "ProjectReviewDescent"("clientId", "sourceReviewId");
CREATE INDEX "ProjectReviewDescent_clientId_targetReviewId_status_idx" ON "ProjectReviewDescent"("clientId", "targetReviewId", "status");
CREATE INDEX "ProjectReviewDescent_clientId_sourceDecisionId_idx" ON "ProjectReviewDescent"("clientId", "sourceDecisionId");

ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_sourceReviewId_fkey" FOREIGN KEY ("sourceReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_targetReviewId_fkey" FOREIGN KEY ("targetReviewId") REFERENCES "ProjectReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewDescent" ADD CONSTRAINT "ProjectReviewDescent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
