-- CreateEnum
CREATE TYPE "ScaleTicketStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED', 'PROCESSED');

-- CreateTable
CREATE TABLE "grain_bins" (
    "id" TEXT NOT NULL,
    "grain_entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" DECIMAL(12,2) NOT NULL,
    "current_bushels" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commodity_type" "CommodityType" NOT NULL,
    "crop_year" INTEGER NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grain_bins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_tickets" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "bin_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "ScaleTicketStatus" NOT NULL DEFAULT 'PENDING',
    "load_number" TEXT,
    "ticket_date" TIMESTAMP(3),
    "net_bushels" DECIMAL(12,2),
    "moisture" DECIMAL(5,2),
    "test_weight" DECIMAL(5,2),
    "commodity_type" "CommodityType",
    "buyer" TEXT,
    "parsed_data" JSONB,
    "parse_error" TEXT,
    "parsed_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scale_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_transactions" (
    "id" TEXT NOT NULL,
    "bin_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bushels" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "scale_ticket_id" TEXT,
    "grain_contract_id" TEXT,
    "created_by" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grain_bins_grain_entity_id_commodity_type_idx" ON "grain_bins"("grain_entity_id", "commodity_type");

-- CreateIndex
CREATE INDEX "grain_bins_crop_year_idx" ON "grain_bins"("crop_year");

-- CreateIndex
CREATE INDEX "scale_tickets_business_id_status_idx" ON "scale_tickets"("business_id", "status");

-- CreateIndex
CREATE INDEX "scale_tickets_bin_id_idx" ON "scale_tickets"("bin_id");

-- CreateIndex
CREATE UNIQUE INDEX "bin_transactions_scale_ticket_id_key" ON "bin_transactions"("scale_ticket_id");

-- CreateIndex
CREATE INDEX "bin_transactions_bin_id_idx" ON "bin_transactions"("bin_id");

-- CreateIndex
CREATE INDEX "bin_transactions_transaction_date_idx" ON "bin_transactions"("transaction_date");

-- AddForeignKey
ALTER TABLE "grain_bins" ADD CONSTRAINT "grain_bins_grain_entity_id_fkey" FOREIGN KEY ("grain_entity_id") REFERENCES "grain_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_tickets" ADD CONSTRAINT "scale_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_tickets" ADD CONSTRAINT "scale_tickets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_tickets" ADD CONSTRAINT "scale_tickets_bin_id_fkey" FOREIGN KEY ("bin_id") REFERENCES "grain_bins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_transactions" ADD CONSTRAINT "bin_transactions_bin_id_fkey" FOREIGN KEY ("bin_id") REFERENCES "grain_bins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_transactions" ADD CONSTRAINT "bin_transactions_scale_ticket_id_fkey" FOREIGN KEY ("scale_ticket_id") REFERENCES "scale_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_transactions" ADD CONSTRAINT "bin_transactions_grain_contract_id_fkey" FOREIGN KEY ("grain_contract_id") REFERENCES "grain_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_transactions" ADD CONSTRAINT "bin_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
