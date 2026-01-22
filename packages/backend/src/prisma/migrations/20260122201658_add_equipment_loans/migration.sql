-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('TRACTOR', 'COMBINE', 'PLANTER', 'SPRAYER', 'GRAIN_CART', 'SEMI_TRUCK', 'TRAILER', 'TILLAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentFinancingType" AS ENUM ('LOAN', 'LEASE');

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipment_type" "EquipmentType" NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DECIMAL(12,2),
    "current_value" DECIMAL(12,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_loans" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "loan_number" TEXT,
    "financing_type" "EquipmentFinancingType" NOT NULL,
    "use_simple_mode" BOOLEAN NOT NULL DEFAULT false,
    "principal" DECIMAL(12,2),
    "interest_rate" DECIMAL(5,4),
    "term_months" INTEGER,
    "start_date" TIMESTAMP(3),
    "payment_frequency" "PaymentFrequency",
    "monthly_payment" DECIMAL(10,2),
    "remaining_balance" DECIMAL(12,2),
    "annual_payment" DECIMAL(12,2),
    "lease_end_date" TIMESTAMP(3),
    "residual_value" DECIMAL(12,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_loan_payments" (
    "id" TEXT NOT NULL,
    "equipment_loan_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "principal_amount" DECIMAL(10,2) NOT NULL,
    "interest_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_business_id_idx" ON "equipment"("business_id");

-- CreateIndex
CREATE INDEX "equipment_equipment_type_idx" ON "equipment"("equipment_type");

-- CreateIndex
CREATE INDEX "equipment_deleted_at_idx" ON "equipment"("deleted_at");

-- CreateIndex
CREATE INDEX "equipment_loans_equipment_id_idx" ON "equipment_loans"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_loans_deleted_at_idx" ON "equipment_loans"("deleted_at");

-- CreateIndex
CREATE INDEX "equipment_loan_payments_equipment_loan_id_idx" ON "equipment_loan_payments"("equipment_loan_id");

-- CreateIndex
CREATE INDEX "equipment_loan_payments_payment_date_idx" ON "equipment_loan_payments"("payment_date");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_loans" ADD CONSTRAINT "equipment_loans_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_loan_payments" ADD CONSTRAINT "equipment_loan_payments_equipment_loan_id_fkey" FOREIGN KEY ("equipment_loan_id") REFERENCES "equipment_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
