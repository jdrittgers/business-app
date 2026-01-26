-- AlterTable
ALTER TABLE "farm_chemical_usage" ADD COLUMN     "is_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template_item_id" TEXT;

-- CreateTable
CREATE TABLE "chemical_plan_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "commodity_type" "CommodityType",
    "year" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chemical_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_plan_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "rate_per_acre" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chemical_plan_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_plan_applications" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by_id" TEXT,
    "has_overrides" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chemical_plan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chemical_plan_templates_business_id_idx" ON "chemical_plan_templates"("business_id");

-- CreateIndex
CREATE INDEX "chemical_plan_templates_commodity_type_idx" ON "chemical_plan_templates"("commodity_type");

-- CreateIndex
CREATE INDEX "chemical_plan_templates_year_idx" ON "chemical_plan_templates"("year");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_plan_templates_business_id_name_key" ON "chemical_plan_templates"("business_id", "name");

-- CreateIndex
CREATE INDEX "chemical_plan_template_items_template_id_idx" ON "chemical_plan_template_items"("template_id");

-- CreateIndex
CREATE INDEX "chemical_plan_template_items_chemical_id_idx" ON "chemical_plan_template_items"("chemical_id");

-- CreateIndex
CREATE INDEX "chemical_plan_applications_template_id_idx" ON "chemical_plan_applications"("template_id");

-- CreateIndex
CREATE INDEX "chemical_plan_applications_farm_id_idx" ON "chemical_plan_applications"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "chemical_plan_applications_template_id_farm_id_key" ON "chemical_plan_applications"("template_id", "farm_id");

-- CreateIndex
CREATE INDEX "farm_chemical_usage_template_item_id_idx" ON "farm_chemical_usage"("template_item_id");

-- AddForeignKey
ALTER TABLE "farm_chemical_usage" ADD CONSTRAINT "farm_chemical_usage_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "chemical_plan_template_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_templates" ADD CONSTRAINT "chemical_plan_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_template_items" ADD CONSTRAINT "chemical_plan_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "chemical_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_template_items" ADD CONSTRAINT "chemical_plan_template_items_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_applications" ADD CONSTRAINT "chemical_plan_applications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "chemical_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_applications" ADD CONSTRAINT "chemical_plan_applications_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_plan_applications" ADD CONSTRAINT "chemical_plan_applications_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
