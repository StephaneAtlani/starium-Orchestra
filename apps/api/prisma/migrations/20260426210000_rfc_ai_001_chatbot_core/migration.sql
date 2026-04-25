-- RFC-AI-001 — Cursor Starium Chatbot Core + journal audit plateforme (GLOBAL sans client métier)

CREATE TYPE "ChatbotKnowledgeScope" AS ENUM ('GLOBAL', 'CLIENT');

CREATE TYPE "ChatbotKnowledgeEntryType" AS ENUM ('FAQ', 'ARTICLE');

CREATE TYPE "ChatbotMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatbotCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "scope" "ChatbotKnowledgeScope" NOT NULL,
    "clientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatbotKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "moduleCode" TEXT,
    "targetRole" "ClientUserRole",
    "requiredPermission" TEXT,
    "categoryId" TEXT,
    "type" "ChatbotKnowledgeEntryType" NOT NULL,
    "scope" "ChatbotKnowledgeScope" NOT NULL,
    "clientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "content" TEXT,
    "structuredLinks" JSONB,
    "relatedEntryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatbotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "matchedEntryId" TEXT,
    "noAnswerFallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformAuditLog_userId_idx" ON "PlatformAuditLog"("userId");
CREATE INDEX "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");
CREATE INDEX "PlatformAuditLog_resourceType_idx" ON "PlatformAuditLog"("resourceType");

CREATE INDEX "ChatbotCategory_scope_isActive_order_idx" ON "ChatbotCategory"("scope", "isActive", "order");
CREATE INDEX "ChatbotCategory_clientId_isActive_order_idx" ON "ChatbotCategory"("clientId", "isActive", "order");
CREATE INDEX "ChatbotCategory_scope_slug_idx" ON "ChatbotCategory"("scope", "slug");
CREATE INDEX "ChatbotCategory_scope_clientId_slug_idx" ON "ChatbotCategory"("scope", "clientId", "slug");

CREATE INDEX "ChatbotKnowledgeEntry_scope_isActive_priority_idx" ON "ChatbotKnowledgeEntry"("scope", "isActive", "priority");
CREATE INDEX "ChatbotKnowledgeEntry_clientId_isActive_priority_idx" ON "ChatbotKnowledgeEntry"("clientId", "isActive", "priority");
CREATE INDEX "ChatbotKnowledgeEntry_moduleCode_requiredPermission_isActive_idx" ON "ChatbotKnowledgeEntry"("moduleCode", "requiredPermission", "isActive");
CREATE INDEX "ChatbotKnowledgeEntry_scope_slug_idx" ON "ChatbotKnowledgeEntry"("scope", "slug");
CREATE INDEX "ChatbotKnowledgeEntry_scope_clientId_slug_idx" ON "ChatbotKnowledgeEntry"("scope", "clientId", "slug");

CREATE INDEX "ChatbotConversation_clientId_userId_updatedAt_idx" ON "ChatbotConversation"("clientId", "userId", "updatedAt");
CREATE INDEX "ChatbotMessage_conversationId_createdAt_idx" ON "ChatbotMessage"("conversationId", "createdAt");
CREATE INDEX "ChatbotMessage_clientId_userId_createdAt_idx" ON "ChatbotMessage"("clientId", "userId", "createdAt");

-- Unicité slug : PostgreSQL ne distingue pas les NULL dans UNIQUE composite — index partiels
CREATE UNIQUE INDEX "ChatbotCategory_global_slug_key" ON "ChatbotCategory" ("slug")
    WHERE "scope" = 'GLOBAL' AND "clientId" IS NULL;

CREATE UNIQUE INDEX "ChatbotCategory_client_slug_key" ON "ChatbotCategory" ("clientId", "slug")
    WHERE "scope" = 'CLIENT';

CREATE UNIQUE INDEX "ChatbotKnowledgeEntry_global_slug_key" ON "ChatbotKnowledgeEntry" ("slug")
    WHERE "scope" = 'GLOBAL' AND "clientId" IS NULL;

CREATE UNIQUE INDEX "ChatbotKnowledgeEntry_client_slug_key" ON "ChatbotKnowledgeEntry" ("clientId", "slug")
    WHERE "scope" = 'CLIENT';

ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatbotCategory" ADD CONSTRAINT "ChatbotCategory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatbotKnowledgeEntry" ADD CONSTRAINT "ChatbotKnowledgeEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChatbotCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatbotKnowledgeEntry" ADD CONSTRAINT "ChatbotKnowledgeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatbotKnowledgeEntry" ADD CONSTRAINT "ChatbotKnowledgeEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChatbotKnowledgeEntry" ADD CONSTRAINT "ChatbotKnowledgeEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatbotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
