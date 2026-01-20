-- CreateTable
CREATE TABLE "local_basis" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "basis_value" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_basis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_basis_business_id_idx" ON "local_basis"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "local_basis_business_id_commodity_type_key" ON "local_basis"("business_id", "commodity_type");

-- AddForeignKey
ALTER TABLE "local_basis" ADD CONSTRAINT "local_basis_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
