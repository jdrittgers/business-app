-- CreateTable
CREATE TABLE "fertilizers" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fertilizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemicals" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_hybrids" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "price_per_bag" DECIMAL(10,2) NOT NULL,
    "seeds_per_bag" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seed_hybrids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acres" DECIMAL(10,2) NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_fertilizer_usage" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "fertilizer_id" TEXT NOT NULL,
    "amount_used" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_fertilizer_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_chemical_usage" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "amount_used" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_chemical_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_seed_usage" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "seed_hybrid_id" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_seed_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_other_costs" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "cost_type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "is_per_acre" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_other_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fertilizers_business_id_idx" ON "fertilizers"("business_id");

-- CreateIndex
CREATE INDEX "chemicals_business_id_idx" ON "chemicals"("business_id");

-- CreateIndex
CREATE INDEX "seed_hybrids_business_id_idx" ON "seed_hybrids"("business_id");

-- CreateIndex
CREATE INDEX "seed_hybrids_commodity_type_idx" ON "seed_hybrids"("commodity_type");

-- CreateIndex
CREATE INDEX "farms_grain_entity_id_idx" ON "farms"("grain_entity_id");

-- CreateIndex
CREATE INDEX "farms_year_idx" ON "farms"("year");

-- CreateIndex
CREATE UNIQUE INDEX "farms_grain_entity_id_name_year_key" ON "farms"("grain_entity_id", "name", "year");

-- CreateIndex
CREATE INDEX "farm_fertilizer_usage_farm_id_idx" ON "farm_fertilizer_usage"("farm_id");

-- CreateIndex
CREATE INDEX "farm_fertilizer_usage_fertilizer_id_idx" ON "farm_fertilizer_usage"("fertilizer_id");

-- CreateIndex
CREATE INDEX "farm_chemical_usage_farm_id_idx" ON "farm_chemical_usage"("farm_id");

-- CreateIndex
CREATE INDEX "farm_chemical_usage_chemical_id_idx" ON "farm_chemical_usage"("chemical_id");

-- CreateIndex
CREATE INDEX "farm_seed_usage_farm_id_idx" ON "farm_seed_usage"("farm_id");

-- CreateIndex
CREATE INDEX "farm_seed_usage_seed_hybrid_id_idx" ON "farm_seed_usage"("seed_hybrid_id");

-- CreateIndex
CREATE INDEX "farm_other_costs_farm_id_idx" ON "farm_other_costs"("farm_id");

-- CreateIndex
CREATE INDEX "farm_other_costs_cost_type_idx" ON "farm_other_costs"("cost_type");

-- AddForeignKey
ALTER TABLE "fertilizers" ADD CONSTRAINT "fertilizers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemicals" ADD CONSTRAINT "chemicals_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seed_hybrids" ADD CONSTRAINT "seed_hybrids_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_fertilizer_usage" ADD CONSTRAINT "farm_fertilizer_usage_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_fertilizer_usage" ADD CONSTRAINT "farm_fertilizer_usage_fertilizer_id_fkey" FOREIGN KEY ("fertilizer_id") REFERENCES "fertilizers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_chemical_usage" ADD CONSTRAINT "farm_chemical_usage_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_chemical_usage" ADD CONSTRAINT "farm_chemical_usage_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_seed_usage" ADD CONSTRAINT "farm_seed_usage_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_seed_usage" ADD CONSTRAINT "farm_seed_usage_seed_hybrid_id_fkey" FOREIGN KEY ("seed_hybrid_id") REFERENCES "seed_hybrids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_other_costs" ADD CONSTRAINT "farm_other_costs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
