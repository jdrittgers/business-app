-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "current_engine_hours" INTEGER,
ADD COLUMN     "john_deere_machine_id" TEXT,
ADD COLUMN     "last_hours_sync_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "john_deere_connections" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT,
    "organization_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "john_deere_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "john_deere_connections_business_id_key" ON "john_deere_connections"("business_id");

-- CreateIndex
CREATE INDEX "equipment_john_deere_machine_id_idx" ON "equipment"("john_deere_machine_id");

-- AddForeignKey
ALTER TABLE "john_deere_connections" ADD CONSTRAINT "john_deere_connections_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
