-- CreateIndex
CREATE INDEX "AuditLogArchive_userId_idx" ON "AuditLogArchive"("userId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_action_idx" ON "AuditLogArchive"("action");

-- CreateIndex
CREATE INDEX "AuditLogArchive_resourceType_idx" ON "AuditLogArchive"("resourceType");
