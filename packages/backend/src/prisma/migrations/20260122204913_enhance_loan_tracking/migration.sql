-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LOAN_PAYMENT_DUE';

-- AlterTable
ALTER TABLE "equipment_loans" ADD COLUMN     "annual_interest_override" DECIMAL(12,2),
ADD COLUMN     "annual_principal_override" DECIMAL(12,2),
ADD COLUMN     "down_payment" DECIMAL(12,2),
ADD COLUMN     "down_payment_date" TIMESTAMP(3),
ADD COLUMN     "include_in_breakeven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_payment_date" TIMESTAMP(3),
ADD COLUMN     "payment_reminder_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "land_loans" ADD COLUMN     "next_payment_date" TIMESTAMP(3),
ADD COLUMN     "payment_reminder_sent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "equipment_loans_next_payment_date_idx" ON "equipment_loans"("next_payment_date");

-- CreateIndex
CREATE INDEX "land_loans_next_payment_date_idx" ON "land_loans"("next_payment_date");
