-- AlterTable
ALTER TABLE "farm_chemical_usage" ADD COLUMN     "acres_applied" DECIMAL(10,2),
ADD COLUMN     "rate_per_acre" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "farm_fertilizer_usage" ADD COLUMN     "acres_applied" DECIMAL(10,2),
ADD COLUMN     "rate_per_acre" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "farm_seed_usage" ADD COLUMN     "acres_applied" DECIMAL(10,2),
ADD COLUMN     "rate_per_acre" DECIMAL(10,2);
