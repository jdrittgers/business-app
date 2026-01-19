-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarketingSignalType" ADD VALUE 'TRADE_POLICY';
ALTER TYPE "MarketingSignalType" ADD VALUE 'WEATHER_ALERT';
ALTER TYPE "MarketingSignalType" ADD VALUE 'BREAKING_NEWS';
