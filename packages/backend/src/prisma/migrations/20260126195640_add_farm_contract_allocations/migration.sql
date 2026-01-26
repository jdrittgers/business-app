-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('PROPORTIONAL', 'MANUAL');

-- CreateTable
CREATE TABLE "farm_contract_allocations" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "allocation_type" "AllocationType" NOT NULL DEFAULT 'PROPORTIONAL',
    "allocated_bushels" DECIMAL(12,2) NOT NULL,
    "manual_percentage" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_contract_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_contract_allocations_contract_id_idx" ON "farm_contract_allocations"("contract_id");

-- CreateIndex
CREATE INDEX "farm_contract_allocations_farm_id_idx" ON "farm_contract_allocations"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "farm_contract_allocations_contract_id_farm_id_key" ON "farm_contract_allocations"("contract_id", "farm_id");

-- AddForeignKey
ALTER TABLE "farm_contract_allocations" ADD CONSTRAINT "farm_contract_allocations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "grain_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_contract_allocations" ADD CONSTRAINT "farm_contract_allocations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
