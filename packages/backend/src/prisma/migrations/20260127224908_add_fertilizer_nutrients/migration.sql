-- AlterTable
ALTER TABLE "farm_fertilizer_usage" ADD COLUMN     "rate_input_unit" TEXT;

-- AlterTable
ALTER TABLE "fertilizers" ADD COLUMN     "is_liquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lbs_per_gallon" DECIMAL(6,3),
ADD COLUMN     "nitrogen_pct" DECIMAL(5,2),
ADD COLUMN     "phosphorus_pct" DECIMAL(5,2),
ADD COLUMN     "potassium_pct" DECIMAL(5,2),
ADD COLUMN     "price_per_purchase_unit" DECIMAL(10,2),
ADD COLUMN     "purchase_unit" TEXT,
ADD COLUMN     "sulfur_pct" DECIMAL(5,2);
