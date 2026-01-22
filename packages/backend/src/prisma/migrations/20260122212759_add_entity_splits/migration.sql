-- CreateTable
CREATE TABLE "farm_entity_splits" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_entity_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_parcel_entity_splits" (
    "id" TEXT NOT NULL,
    "land_parcel_id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_parcel_entity_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_entity_splits" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_entity_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farm_entity_splits_farm_id_idx" ON "farm_entity_splits"("farm_id");

-- CreateIndex
CREATE INDEX "farm_entity_splits_grain_entity_id_idx" ON "farm_entity_splits"("grain_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "farm_entity_splits_farm_id_grain_entity_id_key" ON "farm_entity_splits"("farm_id", "grain_entity_id");

-- CreateIndex
CREATE INDEX "land_parcel_entity_splits_land_parcel_id_idx" ON "land_parcel_entity_splits"("land_parcel_id");

-- CreateIndex
CREATE INDEX "land_parcel_entity_splits_grain_entity_id_idx" ON "land_parcel_entity_splits"("grain_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "land_parcel_entity_splits_land_parcel_id_grain_entity_id_key" ON "land_parcel_entity_splits"("land_parcel_id", "grain_entity_id");

-- CreateIndex
CREATE INDEX "equipment_entity_splits_equipment_id_idx" ON "equipment_entity_splits"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_entity_splits_grain_entity_id_idx" ON "equipment_entity_splits"("grain_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_entity_splits_equipment_id_grain_entity_id_key" ON "equipment_entity_splits"("equipment_id", "grain_entity_id");

-- AddForeignKey
ALTER TABLE "farm_entity_splits" ADD CONSTRAINT "farm_entity_splits_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_entity_splits" ADD CONSTRAINT "farm_entity_splits_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel_entity_splits" ADD CONSTRAINT "land_parcel_entity_splits_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "land_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel_entity_splits" ADD CONSTRAINT "land_parcel_entity_splits_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_entity_splits" ADD CONSTRAINT "equipment_entity_splits_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_entity_splits" ADD CONSTRAINT "equipment_entity_splits_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
