/*
  Warnings:

  - You are about to drop the column `webhookSecret` on the `Organization` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clientSecret]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Organization_webhookSecret_key";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "webhookSecret",
ADD COLUMN     "clientSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clientSecret_key" ON "Organization"("clientSecret");
