-- CreateEnum
CREATE TYPE "ChemicalCategory" AS ENUM ('HERBICIDE', 'IN_FURROW', 'FUNGICIDE');

-- CreateEnum
CREATE TYPE "TrialType" AS ENUM ('SEED', 'FERTILIZER', 'CHEMICAL', 'FUNGICIDE');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "chemicals" ADD COLUMN     "category" "ChemicalCategory" NOT NULL DEFAULT 'HERBICIDE';

-- AlterTable
ALTER TABLE "farm_seed_usage" ADD COLUMN     "is_vrt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vrt_max_rate" DECIMAL(10,2),
ADD COLUMN     "vrt_min_rate" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "farm_trials" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trial_type" "TrialType" NOT NULL,
    "status" "TrialStatus" NOT NULL DEFAULT 'PLANNED',
    "seed_hybrid_id" TEXT,
    "fertilizer_id" TEXT,
    "chemical_id" TEXT,
    "control_product" TEXT,
    "control_rate" DECIMAL(10,4),
    "test_rate" DECIMAL(10,4),
    "plot_location" TEXT,
    "plot_acres" DECIMAL(10,2),
    "target_metric" TEXT,
    "target_value" DECIMAL(10,2),
    "target_unit" TEXT,
    "control_result" DECIMAL(10,2),
    "test_result" DECIMAL(10,2),
    "yield_difference" DECIMAL(10,2),
    "result_notes" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_trial_photos" (
    "id" TEXT NOT NULL,
    "trial_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "taken_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_trial_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_trials_farm_id_idx" ON "farm_trials"("farm_id");

-- CreateIndex
CREATE INDEX "farm_trials_status_idx" ON "farm_trials"("status");

-- CreateIndex
CREATE INDEX "farm_trials_trial_type_idx" ON "farm_trials"("trial_type");

-- CreateIndex
CREATE INDEX "farm_trial_photos_trial_id_idx" ON "farm_trial_photos"("trial_id");

-- CreateIndex
CREATE INDEX "chemicals_category_idx" ON "chemicals"("category");

-- AddForeignKey
ALTER TABLE "farm_trials" ADD CONSTRAINT "farm_trials_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_trials" ADD CONSTRAINT "farm_trials_seed_hybrid_id_fkey" FOREIGN KEY ("seed_hybrid_id") REFERENCES "seed_hybrids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_trials" ADD CONSTRAINT "farm_trials_fertilizer_id_fkey" FOREIGN KEY ("fertilizer_id") REFERENCES "fertilizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_trials" ADD CONSTRAINT "farm_trials_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_trial_photos" ADD CONSTRAINT "farm_trial_photos_trial_id_fkey" FOREIGN KEY ("trial_id") REFERENCES "farm_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
