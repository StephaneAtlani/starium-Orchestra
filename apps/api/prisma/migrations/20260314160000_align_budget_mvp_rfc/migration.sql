-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('OPEX', 'CAPEX');

-- CreateEnum
CREATE TYPE "FinancialSourceType" AS ENUM ('PROJECT', 'ACTIVITY', 'SUPPLIER', 'CONTRACT', 'LICENSE', 'ORDER', 'TEAM_ASSIGNMENT', 'APPLICATION', 'ASSET', 'MANUAL');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('PLANNED', 'RESERVED', 'COMMITTED', 'CONSUMED', 'FORECAST', 'REALLOCATED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "BudgetExerciseStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
BEGIN;
CREATE TYPE "BudgetLineStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
ALTER TABLE "BudgetLine" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BudgetLine" ALTER COLUMN "status" TYPE "BudgetLineStatus_new" USING ("status"::text::"BudgetLineStatus_new");
ALTER TYPE "BudgetLineStatus" RENAME TO "BudgetLineStatus_old";
ALTER TYPE "BudgetLineStatus_new" RENAME TO "BudgetLineStatus";
DROP TYPE "BudgetLineStatus_old";
ALTER TABLE "BudgetLine" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "BudgetStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED');
ALTER TABLE "Budget" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Budget" ALTER COLUMN "status" TYPE "BudgetStatus_new" USING ("status"::text::"BudgetStatus_new");
ALTER TYPE "BudgetStatus" RENAME TO "BudgetStatus_old";
ALTER TYPE "BudgetStatus_new" RENAME TO "BudgetStatus";
DROP TYPE "BudgetStatus_old";
ALTER TABLE "Budget" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "BudgetLine" DROP COLUMN "expenseType",
ADD COLUMN     "expenseType" "ExpenseType" NOT NULL,
ALTER COLUMN "initialAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "revisedAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "forecastAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "committedAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "consumedAmount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "remainingAmount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "FinancialAllocation" DROP COLUMN "sourceType",
ADD COLUMN     "sourceType" "FinancialSourceType" NOT NULL,
DROP COLUMN "allocationType",
ADD COLUMN     "allocationType" "AllocationType" NOT NULL,
ALTER COLUMN "allocatedAmount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "FinancialEvent" DROP COLUMN "sourceType",
ADD COLUMN     "sourceType" "FinancialSourceType" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- DropEnum
DROP TYPE "BudgetLineExpenseType";

-- DropEnum
DROP TYPE "FinancialAllocationSourceType";

-- DropEnum
DROP TYPE "FinancialAllocationType";

-- CreateIndex
CREATE UNIQUE INDEX "BudgetExercise_clientId_code_key" ON "BudgetExercise"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_clientId_code_key" ON "Budget"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEnvelope_clientId_budgetId_code_key" ON "BudgetEnvelope"("clientId", "budgetId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_clientId_budgetId_code_key" ON "BudgetLine"("clientId", "budgetId", "code");

-- CreateIndex
CREATE INDEX "FinancialAllocation_sourceType_sourceId_idx" ON "FinancialAllocation"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialAllocation_allocationType_idx" ON "FinancialAllocation"("allocationType");

-- CreateIndex
CREATE INDEX "FinancialEvent_sourceType_sourceId_idx" ON "FinancialEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialEvent_eventType_idx" ON "FinancialEvent"("eventType");

-- CreateIndex
CREATE INDEX "FinancialEvent_eventDate_idx" ON "FinancialEvent"("eventDate");
