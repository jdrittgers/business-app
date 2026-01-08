-- CreateEnum
CREATE TYPE "RetailerBidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "retailer_bids" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "accepted_by" TEXT,
ADD COLUMN     "status" "RetailerBidStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "retailer_bids_status_idx" ON "retailer_bids"("status");
