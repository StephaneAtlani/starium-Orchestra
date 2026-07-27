-- RFC-MEET-001 — Module Réunions de gouvernance (CODIR, COPIL, COPRO)
--
-- Migration purement ADDITIVE : 13 enums, 10 tables, 1 colonne (EmailDelivery.meetingId),
-- 3 index uniques composites tenant. Aucun DROP, aucun RENAME, aucune donnée touchée.
--
-- Isolation multi-client :
--   * toute table porte `clientId` + FK Client ON DELETE CASCADE + index (clientId)
--   * `MeetingProject` référence `Project` par FK COMPOSITE ("clientId","projectId")
--     -> la base refuse qu'une réunion porte le projet d'un autre client, même en cas
--        de bug applicatif. Cf. RFC-MEET-001 §5.4 (même pattern que RFC-CAPA-001).
--
-- Exécution : `prisma migrate deploy` en job one-shot de release, jamais au boot
-- applicatif (cf. docs/INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md).

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PREPARING', 'SCHEDULED', 'IN_PROGRESS', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingTemplateKind" AS ENUM ('CODIR', 'COPIL', 'COPRO', 'PROJECT_REVIEW', 'BUDGET_REVIEW', 'RISK_COMMITTEE', 'ARBITRATION', 'CRISIS_POINT', 'POST_MORTEM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MeetingScope" AS ENUM ('PROJECT', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "MeetingSectionType" AS ENUM ('COVER', 'ATTENDANCE', 'AGENDA', 'PORTFOLIO_SYNTHESIS', 'PROJECT_STATUS', 'PLANNING_MACRO', 'ALERTS', 'RISKS', 'BLOCKERS', 'BUDGET_CONSUMPTION', 'CAPACITY', 'ARBITRATIONS', 'DECISIONS', 'ACTIONS', 'NEXT_STEPS', 'FREE_TEXT');

-- CreateEnum
CREATE TYPE "MeetingMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "MeetingAttendanceStatus" AS ENUM ('EXPECTED', 'PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "MeetingAgendaItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MeetingDecisionScope" AS ENUM ('MEETING', 'PROJECT', 'MACRO_TASK');

-- CreateEnum
CREATE TYPE "MeetingDecisionType" AS ENUM ('GO', 'NO_GO', 'ARBITRATION', 'BUDGET_VALIDATION', 'SCOPE_CHANGE', 'RISK_ACCEPTANCE', 'PRIORITY_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingDecisionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "MeetingBlockerSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MeetingBlockerStatus" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MeetingAttachmentType" AS ENUM ('URL', 'DOCUMENT_REFERENCE', 'POWERBI_LINK', 'SHAREPOINT_LINK', 'OTHER');

-- AlterTable
ALTER TABLE "EmailDelivery" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;

-- CreateTable
CREATE TABLE "MeetingTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "kind" "MeetingTemplateKind" NOT NULL,
    "scope" "MeetingScope" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "defaultDurationMinutes" INTEGER,
    "cadence" "GovernanceCycleCadence",
    "defaultAgenda" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingTemplateSection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionType" "MeetingSectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "titleOverride" VARCHAR(200),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "objective" VARCHAR(2000),
    "status" "MeetingStatus" NOT NULL DEFAULT 'PREPARING',
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "meetingMode" "MeetingMode",
    "location" VARCHAR(300),
    "meetingUrl" TEXT,
    "facilitatorUserId" TEXT,
    "governanceCycleInstanceId" TEXT,
    "quorumRule" JSONB,
    "sectionsLockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelReason" VARCHAR(1000),
    "snapshotPayload" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rapporteurUserId" TEXT,
    "allocatedMinutes" INTEGER,
    "projectReviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT,
    "resourceId" TEXT,
    "externalEmail" TEXT,
    "displayName" VARCHAR(200),
    "roleLabel" VARCHAR(200),
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "attendanceStatus" "MeetingAttendanceStatus" NOT NULL DEFAULT 'EXPECTED',
    "checkedInAt" TIMESTAMP(3),
    "delegateOfAttendeeId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "lastInvitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSectionInstance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "sectionType" "MeetingSectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "titleOverride" VARCHAR(200),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSectionInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAgendaItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "sectionInstanceId" TEXT,
    "projectId" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "objective" VARCHAR(1000),
    "expectedDecision" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL,
    "plannedDurationMinutes" INTEGER,
    "ownerUserId" TEXT,
    "status" "MeetingAgendaItemStatus" NOT NULL DEFAULT 'TODO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingDecision" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "scope" "MeetingDecisionScope" NOT NULL DEFAULT 'MEETING',
    "projectId" TEXT,
    "projectTaskPhaseId" TEXT,
    "projectTaskId" TEXT,
    "agendaItemId" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "decisionType" "MeetingDecisionType" NOT NULL DEFAULT 'OTHER',
    "status" "MeetingDecisionStatus" NOT NULL DEFAULT 'VALIDATED',
    "impact" VARCHAR(2000),
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "propagatedDecisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingBlocker" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "severity" "MeetingBlockerSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "MeetingBlockerStatus" NOT NULL DEFAULT 'OPEN',
    "projectId" TEXT,
    "riskId" TEXT,
    "taskId" TEXT,
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "raisedAtMeetingId" TEXT NOT NULL,
    "resolvedAtMeetingId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingBlocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttachment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "agendaItemId" TEXT,
    "decisionId" TEXT,
    "attachmentType" "MeetingAttachmentType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" VARCHAR(1000),
    "url" TEXT,
    "documentId" TEXT,
    "fileName" VARCHAR(300),
    "mimeType" VARCHAR(200),
    "sizeBytes" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingTemplate_clientId_idx" ON "MeetingTemplate"("clientId");

-- CreateIndex
CREATE INDEX "MeetingTemplate_clientId_kind_idx" ON "MeetingTemplate"("clientId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingTemplate_clientId_id_key" ON "MeetingTemplate"("clientId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingTemplate_clientId_code_key" ON "MeetingTemplate"("clientId", "code");

-- CreateIndex
CREATE INDEX "MeetingTemplateSection_clientId_idx" ON "MeetingTemplateSection"("clientId");

-- CreateIndex
CREATE INDEX "MeetingTemplateSection_clientId_templateId_idx" ON "MeetingTemplateSection"("clientId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingTemplateSection_templateId_sortOrder_key" ON "MeetingTemplateSection"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "Meeting_clientId_idx" ON "Meeting"("clientId");

-- CreateIndex
CREATE INDEX "Meeting_clientId_status_idx" ON "Meeting"("clientId", "status");

-- CreateIndex
CREATE INDEX "Meeting_clientId_scheduledAt_idx" ON "Meeting"("clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Meeting_clientId_templateId_idx" ON "Meeting"("clientId", "templateId");

-- CreateIndex
CREATE INDEX "Meeting_clientId_governanceCycleInstanceId_idx" ON "Meeting"("clientId", "governanceCycleInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_clientId_id_key" ON "Meeting"("clientId", "id");

-- CreateIndex
CREATE INDEX "MeetingProject_clientId_idx" ON "MeetingProject"("clientId");

-- CreateIndex
CREATE INDEX "MeetingProject_clientId_projectId_idx" ON "MeetingProject"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "MeetingProject_meetingId_sortOrder_idx" ON "MeetingProject"("meetingId", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingProject_projectReviewId_idx" ON "MeetingProject"("projectReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingProject_meetingId_projectId_key" ON "MeetingProject"("meetingId", "projectId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_clientId_idx" ON "MeetingAttendee"("clientId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_clientId_meetingId_idx" ON "MeetingAttendee"("clientId", "meetingId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_userId_idx" ON "MeetingAttendee"("userId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_resourceId_idx" ON "MeetingAttendee"("resourceId");

-- CreateIndex
CREATE INDEX "MeetingSectionInstance_clientId_idx" ON "MeetingSectionInstance"("clientId");

-- CreateIndex
CREATE INDEX "MeetingSectionInstance_clientId_meetingId_idx" ON "MeetingSectionInstance"("clientId", "meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSectionInstance_meetingId_sortOrder_key" ON "MeetingSectionInstance"("meetingId", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingAgendaItem_clientId_idx" ON "MeetingAgendaItem"("clientId");

-- CreateIndex
CREATE INDEX "MeetingAgendaItem_clientId_meetingId_idx" ON "MeetingAgendaItem"("clientId", "meetingId");

-- CreateIndex
CREATE INDEX "MeetingAgendaItem_meetingId_sortOrder_idx" ON "MeetingAgendaItem"("meetingId", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingDecision_clientId_idx" ON "MeetingDecision"("clientId");

-- CreateIndex
CREATE INDEX "MeetingDecision_clientId_meetingId_idx" ON "MeetingDecision"("clientId", "meetingId");

-- CreateIndex
CREATE INDEX "MeetingDecision_clientId_projectId_idx" ON "MeetingDecision"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "MeetingDecision_agendaItemId_idx" ON "MeetingDecision"("agendaItemId");

-- CreateIndex
CREATE INDEX "MeetingBlocker_clientId_idx" ON "MeetingBlocker"("clientId");

-- CreateIndex
CREATE INDEX "MeetingBlocker_clientId_status_idx" ON "MeetingBlocker"("clientId", "status");

-- CreateIndex
CREATE INDEX "MeetingBlocker_clientId_projectId_idx" ON "MeetingBlocker"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "MeetingBlocker_raisedAtMeetingId_idx" ON "MeetingBlocker"("raisedAtMeetingId");

-- CreateIndex
CREATE INDEX "MeetingAttachment_clientId_idx" ON "MeetingAttachment"("clientId");

-- CreateIndex
CREATE INDEX "MeetingAttachment_clientId_meetingId_idx" ON "MeetingAttachment"("clientId", "meetingId");

-- CreateIndex
CREATE INDEX "MeetingAttachment_agendaItemId_idx" ON "MeetingAttachment"("agendaItemId");

-- CreateIndex
CREATE INDEX "MeetingAttachment_decisionId_idx" ON "MeetingAttachment"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_clientId_id_key" ON "Project"("clientId", "id");

-- CreateIndex
CREATE INDEX "EmailDelivery_clientId_meetingId_idx" ON "EmailDelivery"("clientId", "meetingId");

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTemplate" ADD CONSTRAINT "MeetingTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTemplate" ADD CONSTRAINT "MeetingTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTemplateSection" ADD CONSTRAINT "MeetingTemplateSection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTemplateSection" ADD CONSTRAINT "MeetingTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MeetingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MeetingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_facilitatorUserId_fkey" FOREIGN KEY ("facilitatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_governanceCycleInstanceId_fkey" FOREIGN KEY ("governanceCycleInstanceId") REFERENCES "GovernanceCycleInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_clientId_projectId_fkey" FOREIGN KEY ("clientId", "projectId") REFERENCES "Project"("clientId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_rapporteurUserId_fkey" FOREIGN KEY ("rapporteurUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_delegateOfAttendeeId_fkey" FOREIGN KEY ("delegateOfAttendeeId") REFERENCES "MeetingAttendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSectionInstance" ADD CONSTRAINT "MeetingSectionInstance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSectionInstance" ADD CONSTRAINT "MeetingSectionInstance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_sectionInstanceId_fkey" FOREIGN KEY ("sectionInstanceId") REFERENCES "MeetingSectionInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_projectTaskPhaseId_fkey" FOREIGN KEY ("projectTaskPhaseId") REFERENCES "ProjectTaskPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "ProjectRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_raisedAtMeetingId_fkey" FOREIGN KEY ("raisedAtMeetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBlocker" ADD CONSTRAINT "MeetingBlocker_resolvedAtMeetingId_fkey" FOREIGN KEY ("resolvedAtMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MeetingDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

