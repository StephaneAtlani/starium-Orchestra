-- RFC-TEAM-003 Skill catalog (backend)

-- 1) Enums
CREATE TYPE "SkillStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');
CREATE TYPE "SkillReferenceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- 2) Skill categories
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- 3) Skills
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "referenceLevel" "SkillReferenceLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "status" "SkillStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- 4) Constraints
CREATE UNIQUE INDEX "SkillCategory_clientId_normalizedName_key"
ON "SkillCategory"("clientId", "normalizedName");

CREATE UNIQUE INDEX "Skill_clientId_normalizedName_key"
ON "Skill"("clientId", "normalizedName");

-- 5) Indexes
CREATE INDEX "SkillCategory_clientId_idx"
ON "SkillCategory"("clientId");

CREATE INDEX "SkillCategory_clientId_sortOrder_idx"
ON "SkillCategory"("clientId", "sortOrder");

CREATE INDEX "Skill_clientId_idx"
ON "Skill"("clientId");

CREATE INDEX "Skill_clientId_categoryId_idx"
ON "Skill"("clientId", "categoryId");

CREATE INDEX "Skill_clientId_status_idx"
ON "Skill"("clientId", "status");

-- 6) Foreign keys
ALTER TABLE "SkillCategory"
ADD CONSTRAINT "SkillCategory_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Skill"
ADD CONSTRAINT "Skill_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Skill"
ADD CONSTRAINT "Skill_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
