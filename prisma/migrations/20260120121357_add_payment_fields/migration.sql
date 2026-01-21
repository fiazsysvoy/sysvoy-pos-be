-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'JAZZCASH', 'EASYPAISA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentGatewayResponse" JSONB,
ADD COLUMN     "paymentMethod" "PaymentMethod" DEFAULT 'CASH',
ADD COLUMN     "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_transactionId_idx" ON "Order"("transactionId");
