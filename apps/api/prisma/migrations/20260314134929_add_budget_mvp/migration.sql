-- CreateEnum
CREATE TYPE "BudgetExerciseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetEnvelopeType" AS ENUM ('RUN', 'BUILD', 'TRANSVERSE');

-- CreateEnum
CREATE TYPE "BudgetLineStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('OPEX', 'CAPEX');

-- CreateEnum
CREATE TYPE "FinancialSourceType" AS ENUM ('PROJECT', 'ACTIVITY', 'SUPPLIER', 'CONTRACT', 'LICENSE', 'ORDER', 'TEAM_ASSIGNMENT', 'APPLICATION', 'ASSET', 'MANUAL');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('PLANNED', 'RESERVED', 'COMMITTED', 'CONSUMED', 'FORECAST', 'REALLOCATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialEventType" AS ENUM ('LINE_CREATED', 'BUDGET_INITIALIZED', 'ALLOCATION_ADDED', 'ALLOCATION_UPDATED', 'COMMITMENT_REGISTERED', 'CONSUMPTION_REGISTERED', 'FORECAST_UPDATED', 'REALLOCATION_DONE', 'CANCELLATION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "BudgetExercise" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BudgetExerciseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetEnvelope" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BudgetEnvelopeType" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expenseType" "ExpenseType" NOT NULL,
    "status" "BudgetLineStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "initialAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "revisedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "forecastAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "committedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "consumedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAllocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "sourceType" "FinancialSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "allocationType" "AllocationType" NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "sourceType" "FinancialSourceType" NOT NULL,
    "sourceId" TEXT,
    "eventType" "FinancialEventType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetExercise_clientId_code_key" ON "BudgetExercise"("clientId", "code");

-- CreateIndex
CREATE INDEX "BudgetExercise_clientId_idx" ON "BudgetExercise"("clientId");

-- CreateIndex
CREATE INDEX "BudgetExercise_status_idx" ON "BudgetExercise"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_clientId_code_key" ON "Budget"("clientId", "code");

-- CreateIndex
CREATE INDEX "Budget_clientId_idx" ON "Budget"("clientId");

-- CreateIndex
CREATE INDEX "Budget_exerciseId_idx" ON "Budget"("exerciseId");

-- CreateIndex
CREATE INDEX "Budget_status_idx" ON "Budget"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEnvelope_clientId_budgetId_code_key" ON "BudgetEnvelope"("clientId", "budgetId", "code");

-- CreateIndex
CREATE INDEX "BudgetEnvelope_clientId_idx" ON "BudgetEnvelope"("clientId");

-- CreateIndex
CREATE INDEX "BudgetEnvelope_budgetId_idx" ON "BudgetEnvelope"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetEnvelope_parentId_idx" ON "BudgetEnvelope"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_clientId_budgetId_code_key" ON "BudgetLine"("clientId", "budgetId", "code");

-- CreateIndex
CREATE INDEX "BudgetLine_clientId_idx" ON "BudgetLine"("clientId");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "BudgetLine"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetLine_envelopeId_idx" ON "BudgetLine"("envelopeId");

-- CreateIndex
CREATE INDEX "BudgetLine_status_idx" ON "BudgetLine"("status");

-- CreateIndex
CREATE INDEX "FinancialAllocation_clientId_idx" ON "FinancialAllocation"("clientId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_budgetLineId_idx" ON "FinancialAllocation"("budgetLineId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_sourceType_sourceId_idx" ON "FinancialAllocation"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_allocationType_idx" ON "FinancialAllocation"("allocationType");

-- CreateIndex
CREATE INDEX "FinancialEvent_clientId_idx" ON "FinancialEvent"("clientId");

-- CreateIndex
CREATE INDEX "FinancialEvent_budgetLineId_idx" ON "FinancialEvent"("budgetLineId");

-- CreateIndex
CREATE INDEX "FinancialEvent_sourceType_sourceId_idx" ON "FinancialEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialEvent_eventType_idx" ON "FinancialEvent"("eventType");

-- CreateIndex
CREATE INDEX "FinancialEvent_eventDate_idx" ON "FinancialEvent"("eventDate");

-- AddForeignKey
ALTER TABLE "BudgetExercise" ADD CONSTRAINT "BudgetExercise_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BudgetExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BudgetEnvelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "BudgetEnvelope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
