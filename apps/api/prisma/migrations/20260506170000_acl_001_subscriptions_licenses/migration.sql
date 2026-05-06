-- RFC-ACL-001 - Subscriptions and client licenses
-- Vigilance: names are aligned with current Prisma schema ("ClientUser", "Client", "ClientUserRole")

CREATE TYPE "ClientUserLicenseType" AS ENUM ('READ_ONLY', 'READ_WRITE');
CREATE TYPE "ClientUserLicenseBillingMode" AS ENUM (
  'CLIENT_BILLABLE',
  'EXTERNAL_BILLABLE',
  'NON_BILLABLE',
  'PLATFORM_INTERNAL',
  'EVALUATION'
);
CREATE TYPE "ClientSubscriptionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'CANCELED',
  'EXPIRED'
);
CREATE TYPE "SubscriptionBillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "ClientSubscription" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "status" "ClientSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
  "billingPeriod" "SubscriptionBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
  "readWriteSeatsLimit" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientUser"
  ADD COLUMN "licenseType" "ClientUserLicenseType" NOT NULL DEFAULT 'READ_ONLY',
  ADD COLUMN "licenseBillingMode" "ClientUserLicenseBillingMode" NOT NULL DEFAULT 'NON_BILLABLE',
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "licenseStartsAt" TIMESTAMP(3),
  ADD COLUMN "licenseEndsAt" TIMESTAMP(3),
  ADD COLUMN "licenseAssignmentReason" TEXT;

CREATE INDEX "ClientSubscription_clientId_idx" ON "ClientSubscription"("clientId");
CREATE INDEX "ClientSubscription_clientId_status_idx" ON "ClientSubscription"("clientId", "status");
CREATE INDEX "ClientUser_clientId_subscriptionId_idx" ON "ClientUser"("clientId", "subscriptionId");
CREATE INDEX "ClientUser_clientId_licenseType_licenseBillingMode_idx" ON "ClientUser"("clientId", "licenseType", "licenseBillingMode");

ALTER TABLE "ClientSubscription"
  ADD CONSTRAINT "ClientSubscription_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientUser"
  ADD CONSTRAINT "ClientUser_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "ClientSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep subscriptionId optional globally; enforce conditional consistency.
ALTER TABLE "ClientUser"
  ADD CONSTRAINT "ClientUser_billable_subscription_check"
  CHECK (
    (
      "licenseType" = 'READ_WRITE'
      AND "licenseBillingMode" = 'CLIENT_BILLABLE'
      AND "subscriptionId" IS NOT NULL
    )
    OR (
      NOT (
        "licenseType" = 'READ_WRITE'
        AND "licenseBillingMode" = 'CLIENT_BILLABLE'
      )
      AND "subscriptionId" IS NULL
    )
  );

-- Create one ACTIVE subscription per existing client with seat limit aligned
-- to migrated billable users (or minimum default = 1).
INSERT INTO "ClientSubscription" (
  "id",
  "clientId",
  "status",
  "billingPeriod",
  "readWriteSeatsLimit",
  "startsAt",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('acl_sub_', c."id"),
  c."id",
  'ACTIVE'::"ClientSubscriptionStatus",
  'MONTHLY'::"SubscriptionBillingPeriod",
  GREATEST(
    1,
    (
      SELECT COUNT(*)
      FROM "ClientUser" cu
      WHERE cu."clientId" = c."id"
        AND (
          cu."role"::text = 'CLIENT_ADMIN'
          OR cu."role"::text = 'EDITOR'
        )
    )
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

-- Backfill licensing based on real enum values in database.
UPDATE "ClientUser" cu
SET
  "licenseType" = CASE
    WHEN cu."role"::text = 'CLIENT_ADMIN' OR cu."role"::text = 'EDITOR'
      THEN 'READ_WRITE'::"ClientUserLicenseType"
    ELSE 'READ_ONLY'::"ClientUserLicenseType"
  END,
  "licenseBillingMode" = CASE
    WHEN cu."role"::text = 'CLIENT_ADMIN' OR cu."role"::text = 'EDITOR'
      THEN 'CLIENT_BILLABLE'::"ClientUserLicenseBillingMode"
    ELSE 'NON_BILLABLE'::"ClientUserLicenseBillingMode"
  END,
  "subscriptionId" = CASE
    WHEN cu."role"::text = 'CLIENT_ADMIN' OR cu."role"::text = 'EDITOR'
      THEN CONCAT('acl_sub_', cu."clientId")
    ELSE NULL
  END,
  "licenseStartsAt" = COALESCE(cu."createdAt", CURRENT_TIMESTAMP),
  "licenseAssignmentReason" = 'RFC-ACL-001 migration backfill';
