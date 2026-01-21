import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  paymentMethod: z.enum(["CASH", "JAZZCASH", "EASYPAISA"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  amount: z.number().positive("Amount must be positive"),
  customerPhone: z.string().optional(),
  description: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
});

export const refundPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  amount: z.number().positive("Amount must be positive").optional(),
  reason: z.string().optional(),
});

