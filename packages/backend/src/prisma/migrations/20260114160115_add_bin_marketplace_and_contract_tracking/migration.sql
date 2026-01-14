-- AlterTable
ALTER TABLE "grain_bins" ADD COLUMN     "contracted_bushels" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "is_available_for_sale" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "bin_contract_allocations" (
    "id" TEXT NOT NULL,
    "bin_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "bushels_allocated" DECIMAL(12,2) NOT NULL,
    "price_per_bushel" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_contract_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bin_contract_allocations_bin_id_idx" ON "bin_contract_allocations"("bin_id");

-- CreateIndex
CREATE INDEX "bin_contract_allocations_contract_id_idx" ON "bin_contract_allocations"("contract_id");

-- CreateIndex
CREATE INDEX "grain_bins_is_available_for_sale_idx" ON "grain_bins"("is_available_for_sale");

-- AddForeignKey
ALTER TABLE "bin_contract_allocations" ADD CONSTRAINT "bin_contract_allocations_bin_id_fkey" FOREIGN KEY ("bin_id") REFERENCES "grain_bins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_contract_allocations" ADD CONSTRAINT "bin_contract_allocations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "grain_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
