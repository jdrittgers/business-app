-- CreateEnum
CREATE TYPE "PartnerPermissionLevel" AS ENUM ('NONE', 'VIEW', 'ADD', 'EDIT');

-- AlterTable
ALTER TABLE "retailer_access_requests" ADD COLUMN     "equipment_loans_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "fertilizer_chemicals_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "grain_bins_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "grain_contracts_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "land_loans_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "operating_loans_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "permissions_updated_at" TIMESTAMP(3),
ADD COLUMN     "seed_access" "PartnerPermissionLevel" NOT NULL DEFAULT 'NONE';
