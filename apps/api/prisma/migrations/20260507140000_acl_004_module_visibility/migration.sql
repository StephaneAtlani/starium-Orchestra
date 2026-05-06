-- RFC-ACL-004 — visibilité des modules par client / groupe / utilisateur

CREATE TYPE "ModuleVisibilityScopeType" AS ENUM ('CLIENT', 'GROUP', 'USER');
CREATE TYPE "ModuleVisibilityState" AS ENUM ('VISIBLE', 'HIDDEN');

CREATE TABLE "ClientModuleVisibility" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "scopeType" "ModuleVisibilityScopeType" NOT NULL,
    "scopeId" TEXT,
    "visibility" "ModuleVisibilityState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientModuleVisibility_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientModuleVisibility"
    ADD CONSTRAINT "ClientModuleVisibility_scope_consistency_check"
    CHECK (
        ("scopeType" = 'CLIENT' AND "scopeId" IS NULL)
        OR ("scopeType" IN ('GROUP', 'USER') AND "scopeId" IS NOT NULL)
    );

CREATE INDEX "ClientModuleVisibility_clientId_moduleCode_idx"
    ON "ClientModuleVisibility"("clientId", "moduleCode");

CREATE INDEX "ClientModuleVisibility_clientId_scopeType_scopeId_idx"
    ON "ClientModuleVisibility"("clientId", "scopeType", "scopeId");

CREATE UNIQUE INDEX "ClientModuleVisibility_unique_client_scope"
    ON "ClientModuleVisibility"("clientId", "moduleCode")
    WHERE "scopeType" = 'CLIENT';

CREATE UNIQUE INDEX "ClientModuleVisibility_unique_group_user_scope"
    ON "ClientModuleVisibility"("clientId", "moduleCode", "scopeType", "scopeId")
    WHERE "scopeType" IN ('GROUP', 'USER');

ALTER TABLE "ClientModuleVisibility"
    ADD CONSTRAINT "ClientModuleVisibility_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
