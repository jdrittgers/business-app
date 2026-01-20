-- CreateEnum
CREATE TYPE "AccumulatorType" AS ENUM ('EURO', 'WEEKLY', 'DAILY');

-- AlterTable
ALTER TABLE "accumulator_details" ADD COLUMN     "accumulator_type" "AccumulatorType" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "last_processed_date" TIMESTAMP(3),
ADD COLUMN     "total_doubled_bushels" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_bushels" DECIMAL(12,2);
