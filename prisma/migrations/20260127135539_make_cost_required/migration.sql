/*
  Warnings:

  - Made the column `cost` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL values to 0
UPDATE "Product" SET "cost" = 0 WHERE "cost" IS NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "cost" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "cost" SET DEFAULT 0;
