export interface CreateOrderData {
  name?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface UpdateOrderItemsData {
  name?: string;
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
