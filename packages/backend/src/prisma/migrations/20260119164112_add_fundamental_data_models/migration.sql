-- CreateTable
CREATE TABLE "supply_demand_data" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "marketing_year" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "beginning_stocks" DECIMAL(12,2),
    "production" DECIMAL(12,2),
    "imports" DECIMAL(12,2),
    "total_supply" DECIMAL(12,2),
    "feed_and_residue" DECIMAL(12,2),
    "food_seed_industrial" DECIMAL(12,2),
    "ethanol_use" DECIMAL(12,2),
    "exports" DECIMAL(12,2),
    "total_demand" DECIMAL(12,2),
    "ending_stocks" DECIMAL(12,2),
    "stocks_to_use_ratio" DECIMAL(5,4),
    "avg_farm_price" DECIMAL(10,4),
    "avg_farm_price_low" DECIMAL(10,4),
    "avg_farm_price_high" DECIMAL(10,4),
    "world_production" DECIMAL(15,2),
    "world_ending_stocks" DECIMAL(15,2),
    "world_stocks_to_use" DECIMAL(5,4),
    "ending_stocks_change" DECIMAL(12,2),
    "production_change" DECIMAL(12,2),
    "source" TEXT NOT NULL DEFAULT 'USDA_WASDE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_demand_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_progress_data" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "year" INTEGER NOT NULL,
    "week_ending" TIMESTAMP(3) NOT NULL,
    "state" TEXT,
    "planted_pct" DECIMAL(5,2),
    "planted_pct_prev_year" DECIMAL(5,2),
    "planted_pct_avg_5yr" DECIMAL(5,2),
    "emerged_pct" DECIMAL(5,2),
    "emerged_pct_prev_year" DECIMAL(5,2),
    "emerged_pct_avg_5yr" DECIMAL(5,2),
    "condition_excellent" DECIMAL(5,2),
    "condition_good" DECIMAL(5,2),
    "condition_fair" DECIMAL(5,2),
    "condition_poor" DECIMAL(5,2),
    "condition_very_poor" DECIMAL(5,2),
    "good_excellent_pct" DECIMAL(5,2),
    "harvested_pct" DECIMAL(5,2),
    "harvested_pct_prev_year" DECIMAL(5,2),
    "harvested_pct_avg_5yr" DECIMAL(5,2),
    "silking_pct" DECIMAL(5,2),
    "setting_pods_pct" DECIMAL(5,2),
    "dropping_leaves_pct" DECIMAL(5,2),
    "source" TEXT NOT NULL DEFAULT 'USDA_NASS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crop_progress_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_sales_data" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "marketing_year" TEXT NOT NULL,
    "week_ending" TIMESTAMP(3) NOT NULL,
    "weekly_sales" DECIMAL(12,2),
    "weekly_exports" DECIMAL(12,2),
    "cumulative_sales" DECIMAL(12,2),
    "cumulative_exports" DECIMAL(12,2),
    "outstanding_sales" DECIMAL(12,2),
    "sales_vs_prev_year" DECIMAL(5,4),
    "pace_vs_usda" DECIMAL(5,4),
    "top_buyer_1" TEXT,
    "top_buyer_1_volume" DECIMAL(12,2),
    "top_buyer_2" TEXT,
    "top_buyer_2_volume" DECIMAL(12,2),
    "source" TEXT NOT NULL DEFAULT 'USDA_FAS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_sales_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_forecasts" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "year" INTEGER NOT NULL,
    "forecast_date" TIMESTAMP(3) NOT NULL,
    "projected_yield" DECIMAL(6,2) NOT NULL,
    "trend_yield" DECIMAL(6,2),
    "prev_year_yield" DECIMAL(6,2),
    "avg_yield_5yr" DECIMAL(6,2),
    "planted_acres" DECIMAL(12,2),
    "harvested_acres" DECIMAL(12,2),
    "abandoned_acres" DECIMAL(12,2),
    "production_estimate" DECIMAL(15,2),
    "yield_change" DECIMAL(6,2),
    "acreage_change" DECIMAL(12,2),
    "source" TEXT NOT NULL,
    "source_detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yield_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "news_type" TEXT NOT NULL,
    "relevant_commodities" "CommodityType"[],
    "is_breaking_news" BOOLEAN NOT NULL DEFAULT false,
    "importance" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sentiment_score" DECIMAL(3,2),
    "sentiment_label" TEXT,
    "price_impact" TEXT,
    "ai_analysis" TEXT,
    "countries_mentioned" TEXT[],
    "topic_tags" TEXT[],
    "analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usda_report_schedule" (
    "id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "report_name" TEXT NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "release_time" TEXT NOT NULL,
    "commodities" "CommodityType"[],
    "importance" TEXT NOT NULL DEFAULT 'HIGH',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usda_report_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_patterns" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "month" INTEGER NOT NULL,
    "avg_price_index" DECIMAL(5,4) NOT NULL,
    "high_probability" DECIMAL(5,4),
    "low_probability" DECIMAL(5,4),
    "avg_basis_index" DECIMAL(5,4),
    "basis_narrow_pct" DECIMAL(5,4),
    "historical_sell_pct" DECIMAL(5,4),
    "recommended_action" TEXT,
    "years_analyzed" INTEGER NOT NULL DEFAULT 10,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasonal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitment_of_traders" (
    "id" TEXT NOT NULL,
    "commodity_type" "CommodityType" NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "mm_long" INTEGER,
    "mm_short" INTEGER,
    "mm_net" INTEGER,
    "mm_net_change" INTEGER,
    "comm_long" INTEGER,
    "comm_short" INTEGER,
    "comm_net" INTEGER,
    "comm_net_change" INTEGER,
    "open_interest" INTEGER,
    "open_interest_change" INTEGER,
    "mm_net_percentile" DECIMAL(5,2),
    "source" TEXT NOT NULL DEFAULT 'CFTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commitment_of_traders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supply_demand_data_commodity_type_marketing_year_idx" ON "supply_demand_data"("commodity_type", "marketing_year");

-- CreateIndex
CREATE INDEX "supply_demand_data_report_date_idx" ON "supply_demand_data"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "supply_demand_data_commodity_type_marketing_year_report_dat_key" ON "supply_demand_data"("commodity_type", "marketing_year", "report_date");

-- CreateIndex
CREATE INDEX "crop_progress_data_commodity_type_year_idx" ON "crop_progress_data"("commodity_type", "year");

-- CreateIndex
CREATE INDEX "crop_progress_data_week_ending_idx" ON "crop_progress_data"("week_ending");

-- CreateIndex
CREATE UNIQUE INDEX "crop_progress_data_commodity_type_year_week_ending_state_key" ON "crop_progress_data"("commodity_type", "year", "week_ending", "state");

-- CreateIndex
CREATE INDEX "export_sales_data_commodity_type_marketing_year_idx" ON "export_sales_data"("commodity_type", "marketing_year");

-- CreateIndex
CREATE INDEX "export_sales_data_week_ending_idx" ON "export_sales_data"("week_ending");

-- CreateIndex
CREATE UNIQUE INDEX "export_sales_data_commodity_type_marketing_year_week_ending_key" ON "export_sales_data"("commodity_type", "marketing_year", "week_ending");

-- CreateIndex
CREATE INDEX "yield_forecasts_commodity_type_year_idx" ON "yield_forecasts"("commodity_type", "year");

-- CreateIndex
CREATE INDEX "yield_forecasts_forecast_date_idx" ON "yield_forecasts"("forecast_date");

-- CreateIndex
CREATE INDEX "market_news_published_at_idx" ON "market_news"("published_at");

-- CreateIndex
CREATE INDEX "market_news_news_type_idx" ON "market_news"("news_type");

-- CreateIndex
CREATE INDEX "market_news_sentiment_label_idx" ON "market_news"("sentiment_label");

-- CreateIndex
CREATE INDEX "market_news_relevant_commodities_idx" ON "market_news"("relevant_commodities");

-- CreateIndex
CREATE INDEX "usda_report_schedule_release_date_idx" ON "usda_report_schedule"("release_date");

-- CreateIndex
CREATE INDEX "usda_report_schedule_report_type_idx" ON "usda_report_schedule"("report_type");

-- CreateIndex
CREATE INDEX "seasonal_patterns_commodity_type_idx" ON "seasonal_patterns"("commodity_type");

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_patterns_commodity_type_month_key" ON "seasonal_patterns"("commodity_type", "month");

-- CreateIndex
CREATE INDEX "commitment_of_traders_commodity_type_idx" ON "commitment_of_traders"("commodity_type");

-- CreateIndex
CREATE INDEX "commitment_of_traders_report_date_idx" ON "commitment_of_traders"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "commitment_of_traders_commodity_type_report_date_key" ON "commitment_of_traders"("commodity_type", "report_date");
