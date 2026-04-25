-- RFC-038: alerts, notifications, email deliveries (async)

CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');
CREATE TYPE "AlertType" AS ENUM ('BUDGET', 'PROJECT', 'STRATEGIC_VISION', 'SYSTEM', 'GENERIC');
CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'SYSTEM', 'INFO');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "type" "AlertType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "entityLabel" TEXT,
  "actionUrl" TEXT,
  "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
  "ruleCode" TEXT NOT NULL,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "dismissedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alertId" TEXT,
  "type" "NotificationType" NOT NULL DEFAULT 'ALERT',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "entityType" TEXT,
  "entityId" TEXT,
  "entityLabel" TEXT,
  "actionUrl" TEXT,
  "alertSeverity" "AlertSeverity",
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "alertId" TEXT,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "providerMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Alert_clientId_status_severity_idx" ON "Alert"("clientId", "status", "severity");
CREATE INDEX "Alert_clientId_type_severity_entityType_entityId_ruleCode_status_idx" ON "Alert"("clientId", "type", "severity", "entityType", "entityId", "ruleCode", "status");
CREATE INDEX "Alert_clientId_createdAt_idx" ON "Alert"("clientId", "createdAt");
CREATE UNIQUE INDEX "Alert_active_dedup_unique_idx"
  ON "Alert"("clientId", "type", "severity", "entityType", "entityId", "ruleCode")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "Notification_clientId_userId_status_idx" ON "Notification"("clientId", "userId", "status");
CREATE INDEX "Notification_clientId_userId_createdAt_idx" ON "Notification"("clientId", "userId", "createdAt");
CREATE INDEX "Notification_alertId_idx" ON "Notification"("alertId");

CREATE INDEX "EmailDelivery_clientId_status_createdAt_idx" ON "EmailDelivery"("clientId", "status", "createdAt");
CREATE INDEX "EmailDelivery_alertId_idx" ON "EmailDelivery"("alertId");
CREATE INDEX "EmailDelivery_recipient_idx" ON "EmailDelivery"("recipient");

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_dismissedById_fkey"
  FOREIGN KEY ("dismissedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailDelivery"
  ADD CONSTRAINT "EmailDelivery_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailDelivery"
  ADD CONSTRAINT "EmailDelivery_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailDelivery"
  ADD CONSTRAINT "EmailDelivery_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
