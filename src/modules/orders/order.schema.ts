import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z
    .string("Order item must have a product ID")
    .uuid("Invalid product ID"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "Order must contain at least one item"),
});

export const returnItemSchema = z.object({
  orderItemId: z
    .string("Return item must have an order item ID")
    .uuid("Invalid order item ID"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export const returnOrderSchema = z.object({
  orderId: z
    .string("Return order must have an order ID")
    .uuid("Invalid order ID"),
  items: z
    .array(returnItemSchema)
    .min(1, "Return must contain at least one item"),
});

export const orderIdParamSchema = z.object({
  id: z.string("Order ID is required").uuid("Invalid order ID"),
});

export const getOrdersQuerySchema = z.object({
  pageIndex: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 0))
    .refine((v) => v >= 0, "pageIndex must be >= 0"),

  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 10))
    .refine((v) => v > 0 && v <= 100, "pageSize must be 1-100"),
});
