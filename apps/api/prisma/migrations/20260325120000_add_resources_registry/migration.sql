-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('HUMAN', 'MATERIAL', 'LICENSE');

-- CreateTable
CREATE TABLE "ResourceRole" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "ResourceType" NOT NULL,
    "email" TEXT,
    "roleId" TEXT,
    "dailyRate" DECIMAL(12,2),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRole_clientId_name_key" ON "ResourceRole"("clientId", "name");

-- CreateIndex
CREATE INDEX "ResourceRole_clientId_idx" ON "ResourceRole"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_clientId_email_key" ON "Resource"("clientId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_clientId_code_key" ON "Resource"("clientId", "code");

-- CreateIndex
CREATE INDEX "Resource_clientId_idx" ON "Resource"("clientId");

-- CreateIndex
CREATE INDEX "Resource_clientId_type_idx" ON "Resource"("clientId", "type");

-- CreateIndex
CREATE INDEX "Resource_clientId_isActive_idx" ON "Resource"("clientId", "isActive");

-- AddForeignKey
ALTER TABLE "ResourceRole" ADD CONSTRAINT "ResourceRole_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ResourceRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
