-- CreateEnum
CREATE TYPE "CropYear" AS ENUM ('NEW_CROP', 'OLD_CROP');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CASH', 'BASIS', 'HTA', 'ACCUMULATOR');

-- CreateEnum
CREATE TYPE "CommodityType" AS ENUM ('CORN', 'SOYBEANS', 'WHEAT');

-- CreateTable
CREATE TABLE "grain_entities" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grain_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grain_contracts" (
    "id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "crop_year" "CropYear" NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "contract_number" TEXT,
    "buyer" TEXT NOT NULL,
    "total_bushels" DECIMAL(12,2) NOT NULL,
    "delivery_start_date" TIMESTAMP(3),
    "delivery_end_date" TIMESTAMP(3),
    "cash_price" DECIMAL(10,4),
    "basis_price" DECIMAL(10,4),
    "futures_month" TEXT,
    "futures_price" DECIMAL(10,4),
    "bushels_delivered" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grain_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accumulator_details" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "knockout_price" DECIMAL(10,4) NOT NULL,
    "double_up_price" DECIMAL(10,4) NOT NULL,
    "daily_bushels" DECIMAL(12,2) NOT NULL,
    "total_bushels_marketed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accumulator_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accumulator_daily_entries" (
    "id" TEXT NOT NULL,
    "accumulator_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bushels_marketed" DECIMAL(12,2) NOT NULL,
    "market_price" DECIMAL(10,4) NOT NULL,
    "was_doubled_up" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accumulator_daily_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grain_entities_business_id_idx" ON "grain_entities"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "grain_entities_business_id_name_key" ON "grain_entities"("business_id", "name");

-- CreateIndex
CREATE INDEX "grain_contracts_grain_entity_id_crop_year_idx" ON "grain_contracts"("grain_entity_id", "crop_year");

-- CreateIndex
CREATE INDEX "grain_contracts_contract_type_is_active_idx" ON "grain_contracts"("contract_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accumulator_details_contract_id_key" ON "accumulator_details"("contract_id");

-- CreateIndex
CREATE INDEX "accumulator_daily_entries_accumulator_id_idx" ON "accumulator_daily_entries"("accumulator_id");

-- CreateIndex
CREATE UNIQUE INDEX "accumulator_daily_entries_accumulator_id_date_key" ON "accumulator_daily_entries"("accumulator_id", "date");

-- AddForeignKey
ALTER TABLE "grain_entities" ADD CONSTRAINT "grain_entities_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grain_contracts" ADD CONSTRAINT "grain_contracts_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grain_contracts" ADD CONSTRAINT "grain_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accumulator_details" ADD CONSTRAINT "accumulator_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "grain_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accumulator_daily_entries" ADD CONSTRAINT "accumulator_daily_entries_accumulator_id_fkey" FOREIGN KEY ("accumulator_id") REFERENCES "accumulator_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
