/*
  Warnings:

  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('IN_PROCESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'VERIFIED_EMAIL';

-- DropIndex
DROP INDEX "Category_id_organizationId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
