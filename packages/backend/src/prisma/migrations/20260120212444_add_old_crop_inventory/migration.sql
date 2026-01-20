-- CreateTable
CREATE TABLE "old_crop_inventory" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "unpriced_bushels" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "crop_year" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "old_crop_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "old_crop_inventory_business_id_idx" ON "old_crop_inventory"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "old_crop_inventory_business_id_commodity_type_crop_year_key" ON "old_crop_inventory"("business_id", "commodity_type", "crop_year");

-- AddForeignKey
ALTER TABLE "old_crop_inventory" ADD CONSTRAINT "old_crop_inventory_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
