-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "InvoiceProductType" AS ENUM ('FERTILIZER', 'CHEMICAL', 'SEED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "vendor_name" TEXT,
    "invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3),
    "total_amount" DECIMAL(12,2),
    "parsed_data" JSONB,
    "parse_error" TEXT,
    "parsed_at" TIMESTAMP(3),
    "created_bid_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_type" "InvoiceProductType" NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "matched_product_id" TEXT,
    "matched_product_type" "InvoiceProductType",
    "is_new_product" BOOLEAN NOT NULL DEFAULT false,
    "price_locked_at" TIMESTAMP(3),
    "price_locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_history" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "invoice_line_item_id" TEXT NOT NULL,
    "product_type" "InvoiceProductType" NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "purchased_quantity" DECIMAL(10,2) NOT NULL,
    "purchased_unit" TEXT NOT NULL,
    "purchased_price" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "vendor_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_business_id_status_idx" ON "invoices"("business_id", "status");

-- CreateIndex
CREATE INDEX "invoices_uploaded_by_idx" ON "invoices"("uploaded_by");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_product_type_idx" ON "invoice_line_items"("product_type");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_history_invoice_line_item_id_key" ON "purchase_history"("invoice_line_item_id");

-- CreateIndex
CREATE INDEX "purchase_history_business_id_product_type_idx" ON "purchase_history"("business_id", "product_type");

-- CreateIndex
CREATE INDEX "purchase_history_product_id_idx" ON "purchase_history"("product_id");

-- CreateIndex
CREATE INDEX "purchase_history_purchased_at_idx" ON "purchase_history"("purchased_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_bid_request_id_fkey" FOREIGN KEY ("created_bid_request_id") REFERENCES "bid_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_invoice_line_item_id_fkey" FOREIGN KEY ("invoice_line_item_id") REFERENCES "invoice_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
