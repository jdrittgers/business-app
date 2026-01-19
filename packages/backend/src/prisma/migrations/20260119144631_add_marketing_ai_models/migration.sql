-- CreateEnum
CREATE TYPE "MarketingSignalType" AS ENUM ('CASH_SALE', 'BASIS_CONTRACT', 'HTA_RECOMMENDATION', 'ACCUMULATOR_STRATEGY', 'PUT_OPTION', 'CALL_OPTION', 'COLLAR_STRATEGY');

-- CreateEnum
CREATE TYPE "SignalStrength" AS ENUM ('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('ACTIVE', 'TRIGGERED', 'EXPIRED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');

-- CreateTable
CREATE TABLE "marketing_preferences" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "enable_push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "enable_email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "enable_in_app_notifications" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "corn_enabled" BOOLEAN NOT NULL DEFAULT true,
    "soybeans_enabled" BOOLEAN NOT NULL DEFAULT true,
    "wheat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cash_sale_signals" BOOLEAN NOT NULL DEFAULT true,
    "basis_contract_signals" BOOLEAN NOT NULL DEFAULT true,
    "hta_signals" BOOLEAN NOT NULL DEFAULT true,
    "accumulator_signals" BOOLEAN NOT NULL DEFAULT true,
    "options_signals" BOOLEAN NOT NULL DEFAULT false,
    "risk_tolerance" "RiskTolerance" NOT NULL DEFAULT 'MODERATE',
    "target_profit_margin" DECIMAL(10,4) NOT NULL DEFAULT 0.50,
    "min_above_breakeven" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_signals" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "grain_entity_id" TEXT,
    "signal_type" "MarketingSignalType" NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "strength" "SignalStrength" NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_price" DECIMAL(10,4) NOT NULL,
    "break_even_price" DECIMAL(10,4) NOT NULL,
    "target_price" DECIMAL(10,4),
    "price_above_breakeven" DECIMAL(10,4) NOT NULL,
    "percent_above_breakeven" DECIMAL(5,4) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT,
    "ai_analysis" TEXT,
    "ai_analyzed_at" TIMESTAMP(3),
    "market_context" JSONB,
    "recommended_bushels" DECIMAL(12,2),
    "recommended_action" TEXT,
    "expires_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "action_taken" TEXT,
    "action_taken_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "dismiss_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_notifications" (
    "id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "futures_quotes" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "contract_month" TEXT NOT NULL,
    "contract_year" INTEGER NOT NULL,
    "open_price" DECIMAL(10,4),
    "high_price" DECIMAL(10,4),
    "low_price" DECIMAL(10,4),
    "close_price" DECIMAL(10,4) NOT NULL,
    "settlement_price" DECIMAL(10,4),
    "volume" INTEGER,
    "open_interest" INTEGER,
    "price_change" DECIMAL(10,4),
    "quote_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "futures_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basis_data" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "cash_price" DECIMAL(10,4) NOT NULL,
    "futures_month" TEXT NOT NULL,
    "futures_price" DECIMAL(10,4) NOT NULL,
    "basis" DECIMAL(10,4) NOT NULL,
    "price_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basis_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options_positions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "grain_entity_id" TEXT,
    "commodity_type" "CommodityType" NOT NULL,
    "option_type" TEXT NOT NULL,
    "strike_price" DECIMAL(10,4) NOT NULL,
    "futures_month" TEXT NOT NULL,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "contracts" INTEGER NOT NULL,
    "bushels_per_contract" INTEGER NOT NULL DEFAULT 5000,
    "premium" DECIMAL(10,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "current_value" DECIMAL(12,2),
    "last_price_update" TIMESTAMP(3),
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "closed_at" TIMESTAMP(3),
    "closed_price" DECIMAL(10,4),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "options_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_preferences_business_id_key" ON "marketing_preferences"("business_id");

-- CreateIndex
CREATE INDEX "marketing_signals_business_id_status_idx" ON "marketing_signals"("business_id", "status");

-- CreateIndex
CREATE INDEX "marketing_signals_commodity_type_status_idx" ON "marketing_signals"("commodity_type", "status");

-- CreateIndex
CREATE INDEX "marketing_signals_signal_type_status_idx" ON "marketing_signals"("signal_type", "status");

-- CreateIndex
CREATE INDEX "marketing_signals_created_at_idx" ON "marketing_signals"("created_at");

-- CreateIndex
CREATE INDEX "signal_notifications_user_id_idx" ON "signal_notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "signal_notifications_signal_id_user_id_channel_key" ON "signal_notifications"("signal_id", "user_id", "channel");

-- CreateIndex
CREATE INDEX "futures_quotes_commodity_type_contract_month_idx" ON "futures_quotes"("commodity_type", "contract_month");

-- CreateIndex
CREATE INDEX "futures_quotes_quote_date_idx" ON "futures_quotes"("quote_date");

-- CreateIndex
CREATE UNIQUE INDEX "futures_quotes_commodity_type_contract_month_contract_year__key" ON "futures_quotes"("commodity_type", "contract_month", "contract_year", "quote_date");

-- CreateIndex
CREATE INDEX "basis_data_commodity_type_location_idx" ON "basis_data"("commodity_type", "location");

-- CreateIndex
CREATE INDEX "basis_data_price_date_idx" ON "basis_data"("price_date");

-- CreateIndex
CREATE INDEX "options_positions_business_id_is_open_idx" ON "options_positions"("business_id", "is_open");

-- CreateIndex
CREATE INDEX "options_positions_commodity_type_futures_month_idx" ON "options_positions"("commodity_type", "futures_month");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_business_id_idx" ON "ai_analysis_logs"("business_id");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_analysis_type_idx" ON "ai_analysis_logs"("analysis_type");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_created_at_idx" ON "ai_analysis_logs"("created_at");

-- AddForeignKey
ALTER TABLE "marketing_preferences" ADD CONSTRAINT "marketing_preferences_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_notifications" ADD CONSTRAINT "signal_notifications_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "marketing_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
