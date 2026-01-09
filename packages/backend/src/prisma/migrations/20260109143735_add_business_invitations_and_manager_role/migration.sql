-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- CreateTable
CREATE TABLE "business_invitations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_by" TEXT NOT NULL,
    "email" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "used_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_invitations_code_key" ON "business_invitations"("code");

-- CreateIndex
CREATE INDEX "business_invitations_business_id_idx" ON "business_invitations"("business_id");

-- CreateIndex
CREATE INDEX "business_invitations_code_idx" ON "business_invitations"("code");

-- CreateIndex
CREATE INDEX "business_invitations_created_by_idx" ON "business_invitations"("created_by");

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
