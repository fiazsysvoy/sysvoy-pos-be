export interface CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface ReturnOrderData {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}
