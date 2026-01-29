-- CreateEnum
CREATE TYPE "InsurancePlanType" AS ENUM ('RP', 'YP', 'RP_HPE');

-- CreateTable
CREATE TABLE "crop_insurance_policies" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "plan_type" "InsurancePlanType" NOT NULL,
    "coverageLevel" DECIMAL(5,2) NOT NULL,
    "projected_price" DECIMAL(10,4) NOT NULL,
    "volatility_factor" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "premium_per_acre" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "has_sco" BOOLEAN NOT NULL DEFAULT false,
    "has_eco" BOOLEAN NOT NULL DEFAULT false,
    "eco_level" DECIMAL(5,2),
    "sco_premium_per_acre" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "eco_premium_per_acre" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crop_insurance_policies_farm_id_key" ON "crop_insurance_policies"("farm_id");

-- CreateIndex
CREATE INDEX "crop_insurance_policies_farm_id_idx" ON "crop_insurance_policies"("farm_id");

-- AddForeignKey
ALTER TABLE "crop_insurance_policies" ADD CONSTRAINT "crop_insurance_policies_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
