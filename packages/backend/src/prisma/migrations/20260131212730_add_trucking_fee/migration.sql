-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "default_trucking_fee_per_bushel" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "trucking_fee_per_bushel" DECIMAL(10,4);
