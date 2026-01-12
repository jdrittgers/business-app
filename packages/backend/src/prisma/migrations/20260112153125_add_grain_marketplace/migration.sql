-- CreateEnum
CREATE TYPE "GrainPurchaseOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "grain_purchase_offers" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "grain_bin_id" TEXT NOT NULL,
    "bushels_offered" DECIMAL(12,2) NOT NULL,
    "price_per_bushel" DECIMAL(10,4) NOT NULL,
    "total_offer_price" DECIMAL(12,2) NOT NULL,
    "status" "GrainPurchaseOfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiration_date" TIMESTAMP(3),
    "pickup_date" TIMESTAMP(3),
    "notes" TEXT,
    "accepted_at" TIMESTAMP(3),
    "accepted_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grain_purchase_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grain_purchase_offers_retailer_id_idx" ON "grain_purchase_offers"("retailer_id");

-- CreateIndex
CREATE INDEX "grain_purchase_offers_grain_bin_id_idx" ON "grain_purchase_offers"("grain_bin_id");

-- CreateIndex
CREATE INDEX "grain_purchase_offers_status_idx" ON "grain_purchase_offers"("status");

-- AddForeignKey
ALTER TABLE "grain_purchase_offers" ADD CONSTRAINT "grain_purchase_offers_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grain_purchase_offers" ADD CONSTRAINT "grain_purchase_offers_grain_bin_id_fkey" FOREIGN KEY ("grain_bin_id") REFERENCES "grain_bins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
