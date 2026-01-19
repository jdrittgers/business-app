-- AlterTable
ALTER TABLE "marketing_preferences" ADD COLUMN     "max_single_sale_percent" DECIMAL(5,4) DEFAULT 0.25,
ADD COLUMN     "pre_harvest_target_corn" DECIMAL(5,4) DEFAULT 0.50,
ADD COLUMN     "pre_harvest_target_soybeans" DECIMAL(5,4) DEFAULT 0.50,
ADD COLUMN     "pre_harvest_target_wheat" DECIMAL(5,4) DEFAULT 0.50;
