/*
  Warnings:

  - You are about to drop the column `population` on the `farm_seed_usage` table. All the data in the column will be lost.
  - Added the required column `bags_used` to the `farm_seed_usage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "farm_seed_usage" DROP COLUMN "population",
ADD COLUMN     "bags_used" DECIMAL(10,2) NOT NULL;
