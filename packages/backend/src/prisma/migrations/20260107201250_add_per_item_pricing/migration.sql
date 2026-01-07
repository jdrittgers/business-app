-- AlterTable
ALTER TABLE "bid_request_items" ADD COLUMN     "current_price" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "retailer_bid_items" (
    "id" TEXT NOT NULL,
    "retailer_bid_id" TEXT NOT NULL,
    "bid_request_item_id" TEXT NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retailer_bid_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retailer_bid_items_retailer_bid_id_idx" ON "retailer_bid_items"("retailer_bid_id");

-- CreateIndex
CREATE INDEX "retailer_bid_items_bid_request_item_id_idx" ON "retailer_bid_items"("bid_request_item_id");

-- AddForeignKey
ALTER TABLE "retailer_bid_items" ADD CONSTRAINT "retailer_bid_items_retailer_bid_id_fkey" FOREIGN KEY ("retailer_bid_id") REFERENCES "retailer_bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
