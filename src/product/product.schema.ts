import { z } from "zod";

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product id"),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().int().min(0, "Stock must be non-negative").default(0),
  categoryId: z.string().uuid("Invalid category id"),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional(),
});

export const getProductsQuerySchema = z.object({
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

  search: z.string().optional(),
});
