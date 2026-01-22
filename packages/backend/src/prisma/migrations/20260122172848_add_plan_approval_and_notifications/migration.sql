-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FARM_PLAN_CHANGE', 'PRODUCT_NEEDS_PRICING', 'TRIAL_UPDATE', 'GENERAL');

-- AlterTable
ALTER TABLE "chemicals" ADD COLUMN     "needs_pricing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "plan_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan_approved_at" TIMESTAMP(3),
ADD COLUMN     "plan_approved_by" TEXT;

-- AlterTable
ALTER TABLE "fertilizers" ADD COLUMN     "needs_pricing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "seed_hybrids" ADD COLUMN     "needs_pricing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_business_id_idx" ON "notifications"("business_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_plan_approved_by_fkey" FOREIGN KEY ("plan_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
