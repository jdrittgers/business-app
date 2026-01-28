-- AlterTable
ALTER TABLE "land_loans" ADD COLUMN     "farm_id" TEXT,
ADD COLUMN     "grain_entity_id" TEXT;

-- CreateTable
CREATE TABLE "land_loan_entity_splits" (
    "id" TEXT NOT NULL,
    "land_loan_id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_loan_entity_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "land_loan_entity_splits_land_loan_id_idx" ON "land_loan_entity_splits"("land_loan_id");

-- CreateIndex
CREATE INDEX "land_loan_entity_splits_grain_entity_id_idx" ON "land_loan_entity_splits"("grain_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "land_loan_entity_splits_land_loan_id_grain_entity_id_key" ON "land_loan_entity_splits"("land_loan_id", "grain_entity_id");

-- CreateIndex
CREATE INDEX "land_loans_grain_entity_id_idx" ON "land_loans"("grain_entity_id");

-- CreateIndex
CREATE INDEX "land_loans_farm_id_idx" ON "land_loans"("farm_id");

-- AddForeignKey
ALTER TABLE "land_loans" ADD CONSTRAINT "land_loans_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_loans" ADD CONSTRAINT "land_loans_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_loan_entity_splits" ADD CONSTRAINT "land_loan_entity_splits_land_loan_id_fkey" FOREIGN KEY ("land_loan_id") REFERENCES "land_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_loan_entity_splits" ADD CONSTRAINT "land_loan_entity_splits_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
