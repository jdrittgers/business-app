-- AlterTable
ALTER TABLE "farm_chemical_usage" ADD COLUMN     "calendar_event_id" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by_id" TEXT;

-- AlterTable
ALTER TABLE "farm_fertilizer_usage" ADD COLUMN     "calendar_event_id" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by_id" TEXT;

-- AlterTable
ALTER TABLE "farm_seed_usage" ADD COLUMN     "calendar_event_id" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "farm_fertilizer_usage" ADD CONSTRAINT "farm_fertilizer_usage_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_fertilizer_usage" ADD CONSTRAINT "farm_fertilizer_usage_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_chemical_usage" ADD CONSTRAINT "farm_chemical_usage_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_chemical_usage" ADD CONSTRAINT "farm_chemical_usage_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_seed_usage" ADD CONSTRAINT "farm_seed_usage_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_seed_usage" ADD CONSTRAINT "farm_seed_usage_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
