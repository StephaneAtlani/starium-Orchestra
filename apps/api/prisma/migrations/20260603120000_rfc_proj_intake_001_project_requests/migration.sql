-- RFC-PROJ-INTAKE-001 — demandes projet

CREATE TYPE "ProjectRequestStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'NEEDS_MORE_INFO',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CONVERTED_TO_PROJECT'
);

CREATE TYPE "ProjectRequestUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "ProjectRequestRoutingTarget" AS ENUM (
  'PILOTING_CYCLE',
  'DRAFT_PROJECT',
  'PROJECT_BACKLOG',
  'MANUAL_DECISION'
);

CREATE TYPE "ProjectRequestRoutingStatus" AS ENUM (
  'NOT_ROUTED',
  'ROUTED_TO_PILOTING_CYCLE',
  'ROUTED_TO_DRAFT_PROJECT',
  'ROUTED_TO_PROJECT_BACKLOG'
);

CREATE TYPE "ProjectRequestValidatorSelectionMode" AS ENUM (
  'REQUESTER_SELECTS',
  'ADMIN_SELECTS'
);

CREATE TYPE "ProjectRequestAutoAclGrantRole" AS ENUM ('REQUESTER', 'VALIDATOR');

CREATE TABLE "ProjectRequest" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "requesterUserId" TEXT NOT NULL,
  "validatorUserId" TEXT,
  "status" "ProjectRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "urgency" "ProjectRequestUrgency",
  "estimatedBudget" DECIMAL(18,2),
  "expectedBenefits" TEXT,
  "businessContext" TEXT,
  "riskIfNotDone" TEXT,
  "routingTarget" "ProjectRequestRoutingTarget",
  "routingStatus" "ProjectRequestRoutingStatus" NOT NULL DEFAULT 'NOT_ROUTED',
  "decisionComment" TEXT,
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "needsMoreInfoComment" TEXT,
  "convertedProjectId" TEXT,
  "routedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectRequestWorkflowSettings" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "defaultApprovedTarget" "ProjectRequestRoutingTarget" NOT NULL DEFAULT 'MANUAL_DECISION',
  "validatorSelectionMode" "ProjectRequestValidatorSelectionMode" NOT NULL DEFAULT 'REQUESTER_SELECTS',
  "authorizedValidatorUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "authorizedValidatorRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "authorizedRoutingUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "authorizedRoutingRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "allowRequesterToSelectValidator" BOOLEAN NOT NULL DEFAULT true,
  "allowValidatorToChooseRoutingTarget" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectRequestWorkflowSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectRequestAutoAclGrant" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectRequestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grantRole" "ProjectRequestAutoAclGrantRole" NOT NULL,
  "resourceAclId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectRequestAutoAclGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectRequestWorkflowSettings_clientId_key" ON "ProjectRequestWorkflowSettings"("clientId");

CREATE UNIQUE INDEX "ProjectRequestAutoAclGrant_resourceAclId_key" ON "ProjectRequestAutoAclGrant"("resourceAclId");

CREATE INDEX "ProjectRequest_clientId_idx" ON "ProjectRequest"("clientId");
CREATE INDEX "ProjectRequest_clientId_status_idx" ON "ProjectRequest"("clientId", "status");
CREATE INDEX "ProjectRequest_clientId_requesterUserId_idx" ON "ProjectRequest"("clientId", "requesterUserId");
CREATE INDEX "ProjectRequest_clientId_validatorUserId_idx" ON "ProjectRequest"("clientId", "validatorUserId");
CREATE INDEX "ProjectRequest_clientId_routingTarget_idx" ON "ProjectRequest"("clientId", "routingTarget");
CREATE INDEX "ProjectRequest_convertedProjectId_idx" ON "ProjectRequest"("convertedProjectId");

CREATE INDEX "ProjectRequestWorkflowSettings_clientId_idx" ON "ProjectRequestWorkflowSettings"("clientId");

CREATE INDEX "ProjectRequestAutoAclGrant_clientId_projectRequestId_idx" ON "ProjectRequestAutoAclGrant"("clientId", "projectRequestId");
CREATE INDEX "ProjectRequestAutoAclGrant_projectRequestId_userId_idx" ON "ProjectRequestAutoAclGrant"("projectRequestId", "userId");

ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_validatorUserId_fkey" FOREIGN KEY ("validatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectRequestWorkflowSettings" ADD CONSTRAINT "ProjectRequestWorkflowSettings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectRequestAutoAclGrant" ADD CONSTRAINT "ProjectRequestAutoAclGrant_projectRequestId_fkey" FOREIGN KEY ("projectRequestId") REFERENCES "ProjectRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
