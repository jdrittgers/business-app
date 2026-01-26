-- CreateEnum
CREATE TYPE "PassType" AS ENUM ('PRE', 'POST', 'FUNGICIDE', 'IN_FURROW');

-- AlterTable
ALTER TABLE "chemical_plan_templates" ADD COLUMN     "pass_type" "PassType";

-- CreateIndex
CREATE INDEX "chemical_plan_templates_pass_type_idx" ON "chemical_plan_templates"("pass_type");
