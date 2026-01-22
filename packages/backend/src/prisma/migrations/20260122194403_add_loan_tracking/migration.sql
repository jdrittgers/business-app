-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "LoanTransactionType" AS ENUM ('DRAW', 'PAYMENT', 'INTEREST_ACCRUAL', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "land_parcel_id" TEXT;

-- CreateTable
CREATE TABLE "land_parcels" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total_acres" DECIMAL(10,2) NOT NULL,
    "legal_description" TEXT,
    "county" TEXT,
    "state" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DECIMAL(12,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_loans" (
    "id" TEXT NOT NULL,
    "land_parcel_id" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "loan_number" TEXT,
    "use_simple_mode" BOOLEAN NOT NULL DEFAULT false,
    "principal" DECIMAL(12,2),
    "interest_rate" DECIMAL(5,4),
    "term_months" INTEGER,
    "start_date" TIMESTAMP(3),
    "payment_frequency" "PaymentFrequency",
    "monthly_payment" DECIMAL(10,2),
    "remaining_balance" DECIMAL(12,2),
    "annual_payment" DECIMAL(12,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_loan_payments" (
    "id" TEXT NOT NULL,
    "land_loan_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "principal_amount" DECIMAL(10,2) NOT NULL,
    "interest_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_loans" (
    "id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "loan_number" TEXT,
    "credit_limit" DECIMAL(12,2) NOT NULL,
    "interest_rate" DECIMAL(5,4) NOT NULL,
    "current_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_loan_transactions" (
    "id" TEXT NOT NULL,
    "operating_loan_id" TEXT NOT NULL,
    "type" "LoanTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operating_loan_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "land_parcels_business_id_idx" ON "land_parcels"("business_id");

-- CreateIndex
CREATE INDEX "land_parcels_deleted_at_idx" ON "land_parcels"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "land_parcels_business_id_name_key" ON "land_parcels"("business_id", "name");

-- CreateIndex
CREATE INDEX "land_loans_land_parcel_id_idx" ON "land_loans"("land_parcel_id");

-- CreateIndex
CREATE INDEX "land_loans_deleted_at_idx" ON "land_loans"("deleted_at");

-- CreateIndex
CREATE INDEX "land_loan_payments_land_loan_id_idx" ON "land_loan_payments"("land_loan_id");

-- CreateIndex
CREATE INDEX "land_loan_payments_payment_date_idx" ON "land_loan_payments"("payment_date");

-- CreateIndex
CREATE INDEX "operating_loans_grain_entity_id_year_idx" ON "operating_loans"("grain_entity_id", "year");

-- CreateIndex
CREATE INDEX "operating_loans_deleted_at_idx" ON "operating_loans"("deleted_at");

-- CreateIndex
CREATE INDEX "operating_loan_transactions_operating_loan_id_idx" ON "operating_loan_transactions"("operating_loan_id");

-- CreateIndex
CREATE INDEX "operating_loan_transactions_transaction_date_idx" ON "operating_loan_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "farms_land_parcel_id_idx" ON "farms"("land_parcel_id");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "land_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_loans" ADD CONSTRAINT "land_loans_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "land_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_loan_payments" ADD CONSTRAINT "land_loan_payments_land_loan_id_fkey" FOREIGN KEY ("land_loan_id") REFERENCES "land_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_loans" ADD CONSTRAINT "operating_loans_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_loan_transactions" ADD CONSTRAINT "operating_loan_transactions_operating_loan_id_fkey" FOREIGN KEY ("operating_loan_id") REFERENCES "operating_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_loan_transactions" ADD CONSTRAINT "operating_loan_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
