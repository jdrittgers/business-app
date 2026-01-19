-- CreateTable
CREATE TABLE "user_marketing_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "learned_risk_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "avg_sell_price_above_be" DECIMAL(10,4),
    "preferred_sell_window" TEXT,
    "act_on_strong_signals_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "act_on_regular_signals_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avg_response_time_hours" DECIMAL(10,2),
    "corn_preference_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "soybeans_preference_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "wheat_preference_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "cash_sale_preference" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "basis_contract_preference" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "hta_preference" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "accumulator_preference" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "options_preference" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "total_signals_received" INTEGER NOT NULL DEFAULT 0,
    "total_signals_acted_on" INTEGER NOT NULL DEFAULT 0,
    "total_signals_dismissed" INTEGER NOT NULL DEFAULT 0,
    "total_bushels_sold" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" INTEGER NOT NULL DEFAULT 1,
    "confidence_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_marketing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_decisions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "bushels" DECIMAL(12,2) NOT NULL,
    "price_per_bushel" DECIMAL(10,4) NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "break_even_price" DECIMAL(10,4) NOT NULL,
    "percent_above_be" DECIMAL(5,4) NOT NULL,
    "futures_price" DECIMAL(10,4) NOT NULL,
    "basis_at_sale" DECIMAL(10,4) NOT NULL,
    "triggered_by_signal_id" TEXT,
    "rsi_at_sale" DECIMAL(5,2),
    "trend_at_sale" TEXT,
    "volatility_at_sale" DECIMAL(5,4),
    "price_one_week_later" DECIMAL(10,4),
    "price_two_weeks_later" DECIMAL(10,4),
    "price_one_month_later" DECIMAL(10,4),
    "decision_quality" TEXT,
    "decision_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_interactions" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "signal_created_at" TIMESTAMP(3) NOT NULL,
    "interaction_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_time_minutes" INTEGER,
    "signal_type" "MarketingSignalType" NOT NULL,
    "signal_strength" "SignalStrength" NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "price_at_signal" DECIMAL(10,4) NOT NULL,
    "percent_above_be" DECIMAL(5,4) NOT NULL,
    "dismiss_reason" TEXT,
    "action_taken" TEXT,
    "bushels_marketed" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learned_thresholds" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "signal_type" "MarketingSignalType" NOT NULL,
    "strong_buy_threshold" DECIMAL(5,4) NOT NULL,
    "buy_threshold" DECIMAL(5,4) NOT NULL,
    "threshold_adjustment" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "data_points" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learned_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_marketing_profiles_user_id_key" ON "user_marketing_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_marketing_profiles_user_id_idx" ON "user_marketing_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_marketing_profiles_learned_risk_score_idx" ON "user_marketing_profiles"("learned_risk_score");

-- CreateIndex
CREATE INDEX "marketing_decisions_profile_id_idx" ON "marketing_decisions"("profile_id");

-- CreateIndex
CREATE INDEX "marketing_decisions_business_id_idx" ON "marketing_decisions"("business_id");

-- CreateIndex
CREATE INDEX "marketing_decisions_commodity_type_idx" ON "marketing_decisions"("commodity_type");

-- CreateIndex
CREATE INDEX "marketing_decisions_decision_date_idx" ON "marketing_decisions"("decision_date");

-- CreateIndex
CREATE INDEX "signal_interactions_profile_id_idx" ON "signal_interactions"("profile_id");

-- CreateIndex
CREATE INDEX "signal_interactions_signal_id_idx" ON "signal_interactions"("signal_id");

-- CreateIndex
CREATE INDEX "signal_interactions_interaction_type_idx" ON "signal_interactions"("interaction_type");

-- CreateIndex
CREATE INDEX "signal_interactions_signal_strength_idx" ON "signal_interactions"("signal_strength");

-- CreateIndex
CREATE UNIQUE INDEX "signal_interactions_profile_id_signal_id_key" ON "signal_interactions"("profile_id", "signal_id");

-- CreateIndex
CREATE INDEX "learned_thresholds_profile_id_idx" ON "learned_thresholds"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "learned_thresholds_profile_id_commodity_type_signal_type_key" ON "learned_thresholds"("profile_id", "commodity_type", "signal_type");

-- AddForeignKey
ALTER TABLE "user_marketing_profiles" ADD CONSTRAINT "user_marketing_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_decisions" ADD CONSTRAINT "marketing_decisions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_marketing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_decisions" ADD CONSTRAINT "marketing_decisions_triggered_by_signal_id_fkey" FOREIGN KEY ("triggered_by_signal_id") REFERENCES "marketing_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_interactions" ADD CONSTRAINT "signal_interactions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_marketing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_interactions" ADD CONSTRAINT "signal_interactions_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "marketing_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learned_thresholds" ADD CONSTRAINT "learned_thresholds_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_marketing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
