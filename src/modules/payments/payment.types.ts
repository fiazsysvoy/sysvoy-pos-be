export type PaymentMethod = "CASH" | "JAZZCASH" | "EASYPAISA";
export type PaymentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface InitiatePaymentData {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  customerPhone?: string; // For JazzCash/EasyPaisa
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  message: string;
  gatewayResponse?: any;
  redirectUrl?: string; // For redirect-based flows
}

export interface JazzCashConfig {
  merchantId: string;
  password: string;
  integritySalt: string;
  returnUrl: string;
  sandbox: boolean;
}

export interface EasyPaisaConfig {
  storeId: string;
  username: string;
  password: string;
  hashKey: string;
  returnUrl: string;
  sandbox: boolean;
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  message: string;
  rawResponse?: any;
}

