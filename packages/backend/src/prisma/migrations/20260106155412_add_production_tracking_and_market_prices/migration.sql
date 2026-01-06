-- AlterTable
ALTER TABLE "accumulator_details" ADD COLUMN     "is_currently_doubled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_daily_double" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "knockout_date" TIMESTAMP(3),
ADD COLUMN     "knockout_reached" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "grain_contracts" ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2025;

-- CreateTable
CREATE TABLE "crop_year_productions" (
    "id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "year" INTEGER NOT NULL,
    "acres" DECIMAL(12,2) NOT NULL,
    "bushels_per_acre" DECIMAL(10,2) NOT NULL,
    "total_projected" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_year_productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_prices" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "price" DECIMAL(10,4) NOT NULL,
    "price_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "market_type" TEXT NOT NULL DEFAULT 'SPOT',
    "contract_month" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "target_price" DECIMAL(10,4) NOT NULL,
    "alert_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crop_year_productions_grain_entity_id_year_idx" ON "crop_year_productions"("grain_entity_id", "year");

-- CreateIndex
CREATE INDEX "crop_year_productions_commodity_type_year_idx" ON "crop_year_productions"("commodity_type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "crop_year_productions_grain_entity_id_commodity_type_year_key" ON "crop_year_productions"("grain_entity_id", "commodity_type", "year");

-- CreateIndex
CREATE INDEX "market_prices_commodity_type_price_date_idx" ON "market_prices"("commodity_type", "price_date");

-- CreateIndex
CREATE INDEX "market_prices_price_date_idx" ON "market_prices"("price_date");

-- CreateIndex
CREATE INDEX "price_alerts_business_id_is_active_idx" ON "price_alerts"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "price_alerts_commodity_type_is_active_idx" ON "price_alerts"("commodity_type", "is_active");

-- CreateIndex
CREATE INDEX "grain_contracts_grain_entity_id_year_commodity_type_idx" ON "grain_contracts"("grain_entity_id", "year", "commodity_type");

-- AddForeignKey
ALTER TABLE "crop_year_productions" ADD CONSTRAINT "crop_year_productions_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
