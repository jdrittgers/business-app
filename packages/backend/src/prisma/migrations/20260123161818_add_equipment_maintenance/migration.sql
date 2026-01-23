-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('GREASE', 'OIL_CHANGE', 'FILTER_CHANGE', 'INSPECTION', 'REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BY_HOURS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_DUE';

-- CreateTable
CREATE TABLE "equipment_maintenance" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maintenance_type" "MaintenanceType" NOT NULL,
    "frequency" "MaintenanceFrequency" NOT NULL,
    "next_due_date" TIMESTAMP(3),
    "last_completed_date" TIMESTAMP(3),
    "interval_hours" INTEGER,
    "last_completed_hours" INTEGER,
    "next_due_hours" INTEGER,
    "estimated_cost" DECIMAL(10,2),
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_days" INTEGER NOT NULL DEFAULT 7,
    "auto_create_task" BOOLEAN NOT NULL DEFAULT true,
    "current_task_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_history" (
    "id" TEXT NOT NULL,
    "maintenance_id" TEXT NOT NULL,
    "completed_date" TIMESTAMP(3) NOT NULL,
    "completed_by_user_id" TEXT,
    "hours_at_completion" INTEGER,
    "actual_cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_maintenance_current_task_id_key" ON "equipment_maintenance"("current_task_id");

-- CreateIndex
CREATE INDEX "equipment_maintenance_equipment_id_idx" ON "equipment_maintenance"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_maintenance_next_due_date_idx" ON "equipment_maintenance"("next_due_date");

-- CreateIndex
CREATE INDEX "equipment_maintenance_is_active_reminder_sent_idx" ON "equipment_maintenance"("is_active", "reminder_sent");

-- CreateIndex
CREATE INDEX "maintenance_history_maintenance_id_idx" ON "maintenance_history"("maintenance_id");

-- AddForeignKey
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_current_task_id_fkey" FOREIGN KEY ("current_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "equipment_maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
