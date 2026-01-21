-- CreateEnum
CREATE TYPE "RetailerInterest" AS ENUM ('INPUTS', 'GRAIN', 'BOTH');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "retailers" ADD COLUMN     "interest" "RetailerInterest" NOT NULL DEFAULT 'BOTH';

-- CreateTable
CREATE TABLE "retailer_access_requests" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "inputs_status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "grain_status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "inputs_responded_at" TIMESTAMP(3),
    "grain_responded_at" TIMESTAMP(3),
    "responded_by" TEXT,
    "notification_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retailer_access_requests_business_id_inputs_status_idx" ON "retailer_access_requests"("business_id", "inputs_status");

-- CreateIndex
CREATE INDEX "retailer_access_requests_business_id_grain_status_idx" ON "retailer_access_requests"("business_id", "grain_status");

-- CreateIndex
CREATE INDEX "retailer_access_requests_retailer_id_idx" ON "retailer_access_requests"("retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_access_requests_retailer_id_business_id_key" ON "retailer_access_requests"("retailer_id", "business_id");

-- AddForeignKey
ALTER TABLE "retailer_access_requests" ADD CONSTRAINT "retailer_access_requests_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_access_requests" ADD CONSTRAINT "retailer_access_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
