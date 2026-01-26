-- AlterTable
ALTER TABLE "chemicals" ADD COLUMN     "default_rate_per_acre" DECIMAL(10,4),
ADD COLUMN     "rate_unit" TEXT;

-- AlterTable
ALTER TABLE "fertilizers" ADD COLUMN     "default_rate_per_acre" DECIMAL(10,4),
ADD COLUMN     "rate_unit" TEXT;
