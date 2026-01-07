-- CreateEnum
CREATE TYPE "BidRequestStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'RETAILER';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "retailers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "business_license" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_requests" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "BidRequestStatus" NOT NULL DEFAULT 'OPEN',
    "desired_delivery_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "bid_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_request_items" (
    "id" TEXT NOT NULL,
    "bid_request_id" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bid_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_bids" (
    "id" TEXT NOT NULL,
    "bid_request_id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "total_delivered_price" DECIMAL(12,2) NOT NULL,
    "guaranteed_delivery_date" TIMESTAMP(3) NOT NULL,
    "terms_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retailers_user_id_key" ON "retailers"("user_id");

-- CreateIndex
CREATE INDEX "bid_requests_business_id_idx" ON "bid_requests"("business_id");

-- CreateIndex
CREATE INDEX "bid_requests_status_idx" ON "bid_requests"("status");

-- CreateIndex
CREATE INDEX "bid_request_items_bid_request_id_idx" ON "bid_request_items"("bid_request_id");

-- CreateIndex
CREATE INDEX "retailer_bids_retailer_id_idx" ON "retailer_bids"("retailer_id");

-- CreateIndex
CREATE INDEX "retailer_bids_bid_request_id_idx" ON "retailer_bids"("bid_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_bids_bid_request_id_retailer_id_key" ON "retailer_bids"("bid_request_id", "retailer_id");

-- AddForeignKey
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_requests" ADD CONSTRAINT "bid_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_requests" ADD CONSTRAINT "bid_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_request_items" ADD CONSTRAINT "bid_request_items_bid_request_id_fkey" FOREIGN KEY ("bid_request_id") REFERENCES "bid_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_bids" ADD CONSTRAINT "retailer_bids_bid_request_id_fkey" FOREIGN KEY ("bid_request_id") REFERENCES "bid_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_bids" ADD CONSTRAINT "retailer_bids_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
