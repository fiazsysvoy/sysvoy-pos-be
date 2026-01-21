import { Request, Response } from "express";
import { PaymentService } from "./payment.service.js";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} from "./payment.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const paymentService = new PaymentService();

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  // Clean up empty strings to undefined for optional fields
  const cleanedBody = {
    ...req.body,
    customerPhone: req.body.customerPhone?.trim() || undefined,
    description: req.body.description?.trim() || undefined,
  };

  const parsed = initiatePaymentSchema.safeParse(cleanedBody);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ 
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
  }

  const payment = await paymentService.initiatePayment(parsed.data);

  res.status(200).json({
    success: true,
    message: "Payment initiated successfully",
    data: payment,
  });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = verifyPaymentSchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const verification = await paymentService.verifyPayment(parsed.data.transactionId);

  res.json({
    success: true,
    data: verification,
  });
});

export const paymentCallback = asyncHandler(async (req: Request, res: Response) => {
  const { transactionId, gateway } = req.query;
  const gatewayData = req.body;

  if (!transactionId || typeof transactionId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Transaction ID is required",
    });
  }

  const gatewayType = (gateway as string)?.toUpperCase() || "JAZZCASH";
  
  if (gatewayType !== "JAZZCASH" && gatewayType !== "EASYPAISA") {
    return res.status(400).json({
      success: false,
      message: "Invalid gateway type",
    });
  }

  const result = await paymentService.handleCallback(
    transactionId,
    gatewayData,
    gatewayType as "JAZZCASH" | "EASYPAISA"
  );

  // For webhook callbacks, return success to gateway
  res.json({
    success: result.success,
    message: result.message,
    data: result,
  });
});

export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = refundPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const refund = await paymentService.refundPayment(
    parsed.data.orderId,
    parsed.data.amount,
    parsed.data.reason
  );

  res.json({
    success: true,
    message: "Refund processed successfully",
    data: refund,
  });
});

