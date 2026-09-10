-- RFC-PROJ-013-8 F3 — remontées COPRO → COPIL

ALTER TYPE "ProjectReviewAgendaItemType" ADD VALUE IF NOT EXISTS 'ESCALATION';

CREATE TYPE "ProjectReviewEscalationStatus" AS ENUM ('PENDING', 'INJECTED', 'CANCELLED');

CREATE TABLE "ProjectReviewEscalation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceReviewId" TEXT NOT NULL,
    "sourceAgendaItemId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "ownerUserId" TEXT,
    "targetReviewId" TEXT,
    "targetAgendaItemId" TEXT,
    "status" "ProjectReviewEscalationStatus" NOT NULL DEFAULT 'PENDING',
    "injectedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReviewEscalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectReviewEscalation_clientId_projectId_status_idx" ON "ProjectReviewEscalation"("clientId", "projectId", "status");
CREATE INDEX "ProjectReviewEscalation_clientId_sourceReviewId_idx" ON "ProjectReviewEscalation"("clientId", "sourceReviewId");
CREATE INDEX "ProjectReviewEscalation_clientId_targetReviewId_status_idx" ON "ProjectReviewEscalation"("clientId", "targetReviewId", "status");
CREATE INDEX "ProjectReviewEscalation_clientId_sourceAgendaItemId_idx" ON "ProjectReviewEscalation"("clientId", "sourceAgendaItemId");

ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_sourceReviewId_fkey" FOREIGN KEY ("sourceReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_targetReviewId_fkey" FOREIGN KEY ("targetReviewId") REFERENCES "ProjectReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewEscalation" ADD CONSTRAINT "ProjectReviewEscalation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
