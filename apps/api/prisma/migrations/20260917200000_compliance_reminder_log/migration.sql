-- COMP.V2 : journal de déduplication des rappels conformité
CREATE TABLE "ComplianceReminderLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComplianceReminderLog_clientId_entityType_entityId_userId_occurrenceKey_key"
  ON "ComplianceReminderLog"("clientId", "entityType", "entityId", "userId", "occurrenceKey");

CREATE INDEX "ComplianceReminderLog_clientId_sentAt_idx"
  ON "ComplianceReminderLog"("clientId", "sentAt");

ALTER TABLE "ComplianceReminderLog"
  ADD CONSTRAINT "ComplianceReminderLog_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
