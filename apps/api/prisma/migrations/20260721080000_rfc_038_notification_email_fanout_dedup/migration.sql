-- RFC-038 fan-out idempotent : cleanup doublons + index uniques partiels
-- Notification (clientId, userId, alertId) et EmailDelivery critical_alert

-- 1. Notifications : garder la plus ancienne par (clientId, userId, alertId)
DELETE FROM "Notification" AS n
USING "Notification" AS keep
WHERE n."alertId" IS NOT NULL
  AND keep."alertId" IS NOT NULL
  AND n."clientId" = keep."clientId"
  AND n."userId" = keep."userId"
  AND n."alertId" = keep."alertId"
  AND (
    n."createdAt" > keep."createdAt"
    OR (n."createdAt" = keep."createdAt" AND n."id" > keep."id")
  );

-- 2. EmailDelivery critical_alert : garder la plus ancienne par (alertId, recipient)
DELETE FROM "EmailDelivery" AS e
USING "EmailDelivery" AS keep
WHERE e."alertId" IS NOT NULL
  AND keep."alertId" IS NOT NULL
  AND e."templateKey" = 'critical_alert'
  AND keep."templateKey" = 'critical_alert'
  AND e."alertId" = keep."alertId"
  AND e."recipient" = keep."recipient"
  AND (
    e."createdAt" > keep."createdAt"
    OR (e."createdAt" = keep."createdAt" AND e."id" > keep."id")
  );

-- 3. Index uniques partiels (défense en profondeur multi-instances)
CREATE UNIQUE INDEX "Notification_client_user_alert_unique_idx"
  ON "Notification"("clientId", "userId", "alertId")
  WHERE "alertId" IS NOT NULL;

CREATE UNIQUE INDEX "EmailDelivery_critical_alert_dedup_unique_idx"
  ON "EmailDelivery"("alertId", "recipient", "templateKey")
  WHERE "alertId" IS NOT NULL AND "templateKey" = 'critical_alert';
