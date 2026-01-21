/*
  Warnings:

  - A unique constraint covering the columns `[externalOrderId,source,organizationId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "externalOrderId" TEXT;

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductMapping_organizationId_idx" ON "ProductMapping"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_externalProductId_source_organizationId_key" ON "ProductMapping"("externalProductId", "source", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalOrderId_source_organizationId_key" ON "Order"("externalOrderId", "source", "organizationId");

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
