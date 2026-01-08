-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8),
ADD COLUMN     "zip_code" TEXT;

-- AlterTable
ALTER TABLE "retailers" ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8),
ADD COLUMN     "radius_preference" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "zip_code" TEXT;

-- CreateIndex
CREATE INDEX "businesses_latitude_longitude_idx" ON "businesses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "retailers_latitude_longitude_idx" ON "retailers"("latitude", "longitude");
