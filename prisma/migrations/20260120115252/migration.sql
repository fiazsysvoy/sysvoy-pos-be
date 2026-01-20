/*
  Warnings:

  - A unique constraint covering the columns `[webhookSecret]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "webhookSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_webhookSecret_key" ON "Organization"("webhookSecret");
