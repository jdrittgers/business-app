-- AlterTable
ALTER TABLE "equipment_loan_payments" ALTER COLUMN "principal_amount" DROP NOT NULL,
ALTER COLUMN "interest_amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "land_loan_payments" ALTER COLUMN "principal_amount" DROP NOT NULL,
ALTER COLUMN "interest_amount" DROP NOT NULL;
