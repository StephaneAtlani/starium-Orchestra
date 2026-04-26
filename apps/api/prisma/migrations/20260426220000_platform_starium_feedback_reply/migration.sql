-- Réponses admin plateforme aux retours widget Cursor Starium (RFC-AI-001)

CREATE TABLE "PlatformStariumFeedbackReply" (
    "id" TEXT NOT NULL,
    "platformAuditLogId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformStariumFeedbackReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformStariumFeedbackReply_platformAuditLogId_idx" ON "PlatformStariumFeedbackReply"("platformAuditLogId");
CREATE INDEX "PlatformStariumFeedbackReply_authorUserId_idx" ON "PlatformStariumFeedbackReply"("authorUserId");
CREATE INDEX "PlatformStariumFeedbackReply_createdAt_idx" ON "PlatformStariumFeedbackReply"("createdAt");

ALTER TABLE "PlatformStariumFeedbackReply" ADD CONSTRAINT "PlatformStariumFeedbackReply_platformAuditLogId_fkey" FOREIGN KEY ("platformAuditLogId") REFERENCES "PlatformAuditLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformStariumFeedbackReply" ADD CONSTRAINT "PlatformStariumFeedbackReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
