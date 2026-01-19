-- AlterEnum
ALTER TYPE "MarketingSignalType" ADD VALUE 'ACCUMULATOR_INQUIRY';

-- AlterTable
ALTER TABLE "marketing_preferences" ADD COLUMN     "accumulator_inquiry_signals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "accumulator_marketing_percent" DECIMAL(5,4) DEFAULT 0.20,
ADD COLUMN     "accumulator_min_price" DECIMAL(10,4),
ADD COLUMN     "accumulator_percent_above_breakeven" DECIMAL(5,4) DEFAULT 0.10;
