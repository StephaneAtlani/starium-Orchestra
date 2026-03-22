-- CreateEnum
CREATE TYPE "ProjectReviewType" AS ENUM ('COPIL', 'COPRO', 'CODIR_REVIEW', 'RISK_REVIEW', 'MILESTONE_REVIEW', 'AD_HOC');

-- CreateEnum
CREATE TYPE "ProjectReviewStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProjectReview" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "reviewType" "ProjectReviewType" NOT NULL,
    "status" "ProjectReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "executiveSummary" TEXT,
    "contentPayload" JSONB,
    "facilitatorUserId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "snapshotPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReviewParticipant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectReviewId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProjectReviewParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReviewDecision" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectReviewId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReviewActionItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectReviewId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectTaskStatus" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "linkedTaskId" TEXT,

    CONSTRAINT "ProjectReviewActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectReview_clientId_projectId_reviewDate_idx" ON "ProjectReview"("clientId", "projectId", "reviewDate");

-- CreateIndex
CREATE INDEX "ProjectReview_clientId_projectId_status_idx" ON "ProjectReview"("clientId", "projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectReview_projectId_reviewDate_idx" ON "ProjectReview"("projectId", "reviewDate");

-- CreateIndex
CREATE INDEX "ProjectReviewParticipant_clientId_idx" ON "ProjectReviewParticipant"("clientId");

-- CreateIndex
CREATE INDEX "ProjectReviewParticipant_projectReviewId_idx" ON "ProjectReviewParticipant"("projectReviewId");

-- CreateIndex
CREATE INDEX "ProjectReviewDecision_clientId_idx" ON "ProjectReviewDecision"("clientId");

-- CreateIndex
CREATE INDEX "ProjectReviewDecision_projectReviewId_idx" ON "ProjectReviewDecision"("projectReviewId");

-- CreateIndex
CREATE INDEX "ProjectReviewActionItem_clientId_idx" ON "ProjectReviewActionItem"("clientId");

-- CreateIndex
CREATE INDEX "ProjectReviewActionItem_clientId_projectId_idx" ON "ProjectReviewActionItem"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectReviewActionItem_projectReviewId_idx" ON "ProjectReviewActionItem"("projectReviewId");

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_facilitatorUserId_fkey" FOREIGN KEY ("facilitatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewParticipant" ADD CONSTRAINT "ProjectReviewParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewParticipant" ADD CONSTRAINT "ProjectReviewParticipant_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewParticipant" ADD CONSTRAINT "ProjectReviewParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewDecision" ADD CONSTRAINT "ProjectReviewDecision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewDecision" ADD CONSTRAINT "ProjectReviewDecision_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewActionItem" ADD CONSTRAINT "ProjectReviewActionItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewActionItem" ADD CONSTRAINT "ProjectReviewActionItem_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewActionItem" ADD CONSTRAINT "ProjectReviewActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewActionItem" ADD CONSTRAINT "ProjectReviewActionItem_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
