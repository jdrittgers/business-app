-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "retailers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;
