-- RFC-PROJ-013-2 Migration H — review attachments
CREATE TYPE "ProjectReviewAttachmentType" AS ENUM (
  'URL',
  'DOCUMENT_REFERENCE',
  'POWERBI_LINK',
  'SHAREPOINT_LINK',
  'OTHER',
  'FILE'
);

CREATE TABLE "ProjectReviewAttachment" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectReviewId" TEXT NOT NULL,
  "agendaItemId" TEXT,
  "decisionId" TEXT,
  "actionItemId" TEXT,
  "attachmentType" "ProjectReviewAttachmentType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "documentId" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectReviewAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectReviewAttachment_clientId_projectReviewId_idx" ON "ProjectReviewAttachment"("clientId", "projectReviewId");
CREATE INDEX "ProjectReviewAttachment_projectReviewId_idx" ON "ProjectReviewAttachment"("projectReviewId");
CREATE INDEX "ProjectReviewAttachment_agendaItemId_idx" ON "ProjectReviewAttachment"("agendaItemId");
CREATE INDEX "ProjectReviewAttachment_decisionId_idx" ON "ProjectReviewAttachment"("decisionId");
CREATE INDEX "ProjectReviewAttachment_actionItemId_idx" ON "ProjectReviewAttachment"("actionItemId");
CREATE INDEX "ProjectReviewAttachment_documentId_idx" ON "ProjectReviewAttachment"("documentId");

ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "ProjectReviewAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "ProjectReviewDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ProjectReviewActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectReviewAttachment" ADD CONSTRAINT "ProjectReviewAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
