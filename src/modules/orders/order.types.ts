export interface CreateOrderData {
  name?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod?: "CASH" | "JAZZCASH" | "EASYPAISA";
  customerPhone?: string;
  discount?: number;
}

export interface UpdateOrderItemsData {
  name?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  discount?: number;
}

export interface ReturnOrderData {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}
