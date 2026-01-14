-- AlterTable
ALTER TABLE "bid_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "grain_bins" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "grain_contracts" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "grain_entities" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "retailers" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "stripe_price_id" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "interval" TEXT NOT NULL,
    "max_contracts" INTEGER,
    "max_bins" INTEGER,
    "max_bids_per_month" INTEGER,
    "max_farms" INTEGER,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscriptions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_subscriptions" (
    "id" TEXT NOT NULL,
    "retailer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_history" (
    "id" TEXT NOT NULL,
    "business_subscription_id" TEXT,
    "retailer_subscription_id" TEXT,
    "stripe_invoice_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "invoice_url" TEXT,
    "invoice_pdf" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripe_price_id_key" ON "subscription_plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_business_id_key" ON "business_subscriptions"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_stripe_customer_id_key" ON "business_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_stripe_subscription_id_key" ON "business_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "business_subscriptions_business_id_idx" ON "business_subscriptions"("business_id");

-- CreateIndex
CREATE INDEX "business_subscriptions_status_idx" ON "business_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_subscriptions_retailer_id_key" ON "retailer_subscriptions"("retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_subscriptions_stripe_customer_id_key" ON "retailer_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_subscriptions_stripe_subscription_id_key" ON "retailer_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "retailer_subscriptions_retailer_id_idx" ON "retailer_subscriptions"("retailer_id");

-- CreateIndex
CREATE INDEX "retailer_subscriptions_status_idx" ON "retailer_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_history_stripe_invoice_id_key" ON "payment_history"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "payment_history_business_subscription_id_idx" ON "payment_history"("business_subscription_id");

-- CreateIndex
CREATE INDEX "payment_history_retailer_subscription_id_idx" ON "payment_history"("retailer_subscription_id");

-- CreateIndex
CREATE INDEX "bid_requests_deleted_at_idx" ON "bid_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "businesses_deleted_at_idx" ON "businesses"("deleted_at");

-- CreateIndex
CREATE INDEX "farms_deleted_at_idx" ON "farms"("deleted_at");

-- CreateIndex
CREATE INDEX "grain_bins_deleted_at_idx" ON "grain_bins"("deleted_at");

-- CreateIndex
CREATE INDEX "grain_contracts_deleted_at_idx" ON "grain_contracts"("deleted_at");

-- CreateIndex
CREATE INDEX "grain_entities_deleted_at_idx" ON "grain_entities"("deleted_at");

-- CreateIndex
CREATE INDEX "retailers_deleted_at_idx" ON "retailers"("deleted_at");

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_subscriptions" ADD CONSTRAINT "retailer_subscriptions_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_subscriptions" ADD CONSTRAINT "retailer_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_business_subscription_id_fkey" FOREIGN KEY ("business_subscription_id") REFERENCES "business_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_retailer_subscription_id_fkey" FOREIGN KEY ("retailer_subscription_id") REFERENCES "retailer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
