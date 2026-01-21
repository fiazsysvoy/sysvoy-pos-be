import { prismaClient } from "../../lib/prisma.js";
import { HttpError } from "../../utils/HttpError.js";
import {
  InitiatePaymentData,
  PaymentResponse,
  PaymentGatewayResponse,
  JazzCashConfig,
  EasyPaisaConfig,
} from "./payment.types.js";
import * as crypto from "crypto";

export class PaymentService {
  private jazzCashConfig: JazzCashConfig | null = null;
  private easyPaisaConfig: EasyPaisaConfig | null = null;
  private useDummyMode: boolean = true; // Default to dummy mode for testing

  constructor() {
    // Load configuration from environment variables
    this.loadConfig();
  }

  private loadConfig() {
    // JazzCash Configuration
    if (
      process.env.JAZZCASH_MERCHANT_ID &&
      process.env.JAZZCASH_PASSWORD &&
      process.env.JAZZCASH_INTEGRITY_SALT
    ) {
      this.jazzCashConfig = {
        merchantId: process.env.JAZZCASH_MERCHANT_ID,
        password: process.env.JAZZCASH_PASSWORD,
        integritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
        returnUrl: process.env.JAZZCASH_RETURN_URL || "http://localhost:3000/payment/callback",
        sandbox: process.env.JAZZCASH_SANDBOX === "true" || !process.env.JAZZCASH_SANDBOX,
      };
    }

    // EasyPaisa Configuration
    if (
      process.env.EASYPAISA_STORE_ID &&
      process.env.EASYPAISA_USERNAME &&
      process.env.EASYPAISA_PASSWORD &&
      process.env.EASYPAISA_HASH_KEY
    ) {
      this.easyPaisaConfig = {
        storeId: process.env.EASYPAISA_STORE_ID,
        username: process.env.EASYPAISA_USERNAME,
        password: process.env.EASYPAISA_PASSWORD,
        hashKey: process.env.EASYPAISA_HASH_KEY,
        returnUrl: process.env.EASYPAISA_RETURN_URL || "http://localhost:3000/payment/callback",
        sandbox: process.env.EASYPAISA_SANDBOX === "true" || !process.env.EASYPAISA_SANDBOX,
      };
    }

    // Check if dummy mode should be used
    this.useDummyMode = process.env.PAYMENT_DUMMY_MODE === "true" || !this.jazzCashConfig && !this.easyPaisaConfig;
  }

  async initiatePayment(data: InitiatePaymentData): Promise<PaymentResponse> {
    const { orderId, paymentMethod, amount, customerPhone } = data;

    // Verify order exists and get details
    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new HttpError("Order not found", 404);
    }

    // Allow small difference due to rounding (e.g., tax calculations)
    const amountDifference = Math.abs(order.totalAmount - amount);
    if (amountDifference > 0.01) {
      throw new HttpError(
        `Payment amount (${amount}) does not match order total (${order.totalAmount})`,
        400
      );
    }

    // For gateway payments, customer phone is required (provided in payment request)
    if (paymentMethod !== "CASH" && !customerPhone?.trim()) {
      throw new HttpError("Customer phone number is required for gateway payments", 400);
    }

    // Handle cash payments (no gateway needed)
    if (paymentMethod === "CASH") {
      return await this.processCashPayment(orderId);
    }

    // Use dummy mode if enabled or if no gateway config
    if (this.useDummyMode) {
      return await this.processDummyPayment(orderId, paymentMethod, amount);
    }

    // Process gateway payments with phone number
    const paymentDataWithPhone = { ...data, customerPhone: phoneToUse };
    if (paymentMethod === "JAZZCASH") {
      return await this.processJazzCashPayment(paymentDataWithPhone);
    } else if (paymentMethod === "EASYPAISA") {
      return await this.processEasyPaisaPayment(paymentDataWithPhone);
    }

    throw new HttpError("Invalid payment method", 400);
  }

  private async processCashPayment(orderId: string): Promise<PaymentResponse> {
    const transactionId = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await prismaClient.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: "CASH",
        paymentStatus: "COMPLETED",
        transactionId,
        paidAt: new Date(),
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      transactionId,
      status: "COMPLETED",
      message: "Cash payment processed successfully",
    };
  }

  private async processDummyPayment(
    orderId: string,
    paymentMethod: "JAZZCASH" | "EASYPAISA",
    amount: number
  ): Promise<PaymentResponse> {
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate dummy transaction ID
    const transactionId = `${paymentMethod}-DUMMY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate success (90% success rate for testing)
    const success = Math.random() > 0.1;

    const status = success ? "COMPLETED" : "FAILED";
    const message = success
      ? `Dummy ${paymentMethod} payment processed successfully`
      : `Dummy ${paymentMethod} payment failed (simulated)`;

    // Update order with payment details
    await prismaClient.order.update({
      where: { id: orderId },
      data: {
        paymentMethod,
        paymentStatus: status,
        transactionId,
        paymentGatewayResponse: {
          dummy: true,
          success,
          message,
          amount,
          timestamp: new Date().toISOString(),
        },
        paidAt: success ? new Date() : null,
        status: success ? "COMPLETED" : "IN_PROCESS",
        completedAt: success ? new Date() : null,
      },
    });

    return {
      success,
      transactionId,
      status,
      message,
      gatewayResponse: {
        dummy: true,
        transactionId,
        amount,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async processJazzCashPayment(
    data: InitiatePaymentData
  ): Promise<PaymentResponse> {
    if (!this.jazzCashConfig) {
      throw new HttpError("JazzCash configuration not found", 500);
    }

    const { orderId, amount, customerPhone, description } = data;
    const { merchantId, password, integritySalt, returnUrl, sandbox } = this.jazzCashConfig;

    // Generate transaction reference
    const pp_TxnRefNo = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create secure hash (JazzCash uses SHA256)
    const pp_Amount = amount.toString();
    const pp_BillReference = orderId;
    const pp_Description = description || `Order payment for ${orderId}`;
    const pp_MerchantID = merchantId;
    const pp_Password = password;
    const pp_ReturnURL = returnUrl;
    const pp_TxnDateTime = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    const pp_TxnExpiryDateTime = new Date(Date.now() + 30 * 60 * 1000)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0];
    const pp_TxnType = "MPAY";

    // Create integrity salt string
    const integrityString = `${integritySalt}&${pp_Amount}&${pp_BillReference}&${pp_Description}&${pp_MerchantID}&${pp_Password}&${pp_ReturnURL}&${pp_TxnDateTime}&${pp_TxnExpiryDateTime}&${pp_TxnRefNo}&${pp_TxnType}`;
    const pp_SecureHash = crypto.createHash("sha256").update(integrityString).digest("hex").toUpperCase();

    // Prepare request payload
    const payload = {
      pp_Amount,
      pp_BillReference,
      pp_Description,
      pp_MerchantID,
      pp_Password,
      pp_ReturnURL,
      pp_SecureHash,
      pp_TxnDateTime,
      pp_TxnExpiryDateTime,
      pp_TxnRefNo,
      pp_TxnType,
      ...(customerPhone && { pp_MobileNumber: customerPhone }),
    };

    // API endpoint (sandbox or production)
    const apiUrl = sandbox
      ? "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
      : "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform";

    try {
      // For JazzCash, we typically redirect to their hosted form
      // But for API integration, we can use their REST API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload as any).toString(),
      });

      const responseData = await response.text();

      // Update order with pending payment status
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: "JAZZCASH",
          paymentStatus: "PROCESSING",
          transactionId: pp_TxnRefNo,
          paymentGatewayResponse: {
            requestPayload: payload,
            response: responseData,
          },
        },
      });

      // JazzCash typically returns a redirect URL or form
      return {
        success: true,
        transactionId: pp_TxnRefNo,
        status: "PROCESSING",
        message: "Payment initiated, redirecting to JazzCash",
        redirectUrl: apiUrl, // In real implementation, parse from response
        gatewayResponse: {
          transactionRef: pp_TxnRefNo,
          redirectUrl: apiUrl,
        },
      };
    } catch (error: any) {
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: "JAZZCASH",
          paymentStatus: "FAILED",
          paymentGatewayResponse: {
            error: error.message,
          },
        },
      });

      throw new HttpError(`JazzCash payment failed: ${error.message}`, 500);
    }
  }

  private async processEasyPaisaPayment(
    data: InitiatePaymentData
  ): Promise<PaymentResponse> {
    if (!this.easyPaisaConfig) {
      throw new HttpError("EasyPaisa configuration not found", 500);
    }

    const { orderId, amount, customerPhone, description } = data;
    const { storeId, username, password, hashKey, returnUrl, sandbox } = this.easyPaisaConfig;

    // Generate transaction reference
    const orderRefNum = `EP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create hash (EasyPaisa uses specific hash algorithm)
    const hashString = `${storeId}${orderRefNum}${amount}${returnUrl}${hashKey}`;
    const hash = crypto.createHash("sha256").update(hashString).digest("hex").toUpperCase();

    // Prepare request payload
    const payload = {
      storeId,
      orderRefNum,
      orderAmount: amount.toString(),
      orderDateTime: new Date().toISOString(),
      merchantHashedReq: hash,
      returnURL: returnUrl,
      ...(customerPhone && { mobileAccountNo: customerPhone }),
      ...(description && { orderDetail: description }),
    };

    // API endpoint (sandbox or production)
    const apiUrl = sandbox
      ? "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf"
      : "https://easypay.easypaisa.com.pk/easypay/Index.jsf";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload as any).toString(),
      });

      const responseData = await response.text();

      // Update order with pending payment status
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: "EASYPAISA",
          paymentStatus: "PROCESSING",
          transactionId: orderRefNum,
          paymentGatewayResponse: {
            requestPayload: payload,
            response: responseData,
          },
        },
      });

      return {
        success: true,
        transactionId: orderRefNum,
        status: "PROCESSING",
        message: "Payment initiated, redirecting to EasyPaisa",
        redirectUrl: apiUrl,
        gatewayResponse: {
          transactionRef: orderRefNum,
          redirectUrl: apiUrl,
        },
      };
    } catch (error: any) {
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: "EASYPAISA",
          paymentStatus: "FAILED",
          paymentGatewayResponse: {
            error: error.message,
          },
        },
      });

      throw new HttpError(`EasyPaisa payment failed: ${error.message}`, 500);
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentGatewayResponse> {
    // In dummy mode, simulate verification
    if (this.useDummyMode) {
      const order = await prismaClient.order.findFirst({
        where: { transactionId },
      });

      if (!order) {
        throw new HttpError("Transaction not found", 404);
      }

      return {
        success: order.paymentStatus === "COMPLETED",
        transactionId,
        status: order.paymentStatus as any,
        message: `Payment status: ${order.paymentStatus}`,
        rawResponse: order.paymentGatewayResponse,
      };
    }

    // Real gateway verification would go here
    // This would call JazzCash/EasyPaisa status inquiry APIs
    throw new HttpError("Payment verification not implemented for production", 501);
  }

  async handleCallback(
    transactionId: string,
    gatewayData: any,
    gateway: "JAZZCASH" | "EASYPAISA"
  ): Promise<PaymentGatewayResponse> {
    const order = await prismaClient.order.findFirst({
      where: { transactionId },
    });

    if (!order) {
      throw new HttpError("Order not found", 404);
    }

    // Verify callback authenticity (check hash/signature)
    // In dummy mode, accept all callbacks
    if (!this.useDummyMode) {
      // Verify hash/signature from gateway
      // Implementation depends on gateway requirements
    }

    // Determine payment status from gateway response
    const isSuccess = gatewayData.pp_ResponseCode === "000" || gatewayData.status === "success";

    const paymentStatus = isSuccess ? "COMPLETED" : "FAILED";

    await prismaClient.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        paymentGatewayResponse: gatewayData,
        paidAt: isSuccess ? new Date() : null,
        status: isSuccess ? "COMPLETED" : order.status,
        completedAt: isSuccess ? new Date() : order.completedAt,
      },
    });

    return {
      success: isSuccess,
      transactionId,
      status: paymentStatus,
      message: isSuccess ? "Payment completed successfully" : "Payment failed",
      rawResponse: gatewayData,
    };
  }

  async refundPayment(orderId: string, amount?: number, reason?: string): Promise<PaymentResponse> {
    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new HttpError("Order not found", 404);
    }

    if (order.paymentStatus !== "COMPLETED") {
      throw new HttpError("Order payment not completed, cannot refund", 400);
    }

    const refundAmount = amount || order.totalAmount;

    if (refundAmount > order.totalAmount) {
      throw new HttpError("Refund amount cannot exceed order total", 400);
    }

    // In dummy mode, simulate refund
    if (this.useDummyMode || order.paymentMethod === "CASH") {
      const refundTransactionId = `REFUND-${order.transactionId}-${Date.now()}`;

      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "REFUNDED",
          paymentGatewayResponse: {
            ...(order.paymentGatewayResponse as any),
            refund: {
              transactionId: refundTransactionId,
              amount: refundAmount,
              reason,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });

      return {
        success: true,
        transactionId: refundTransactionId,
        status: "REFUNDED",
        message: `Refund of ${refundAmount} processed successfully`,
      };
    }

    // Real gateway refund would go here
    throw new HttpError("Refund not implemented for production gateways", 501);
  }
}

