-- AlterTable
ALTER TABLE "accumulator_details" ADD COLUMN     "base_price" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "marketing_signals" ADD COLUMN     "crop_year" INTEGER,
ADD COLUMN     "is_new_crop" BOOLEAN NOT NULL DEFAULT false;
