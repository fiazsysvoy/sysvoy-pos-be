import { z } from "zod";

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product id"),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),

  price: z.preprocess((val) => Number(val), z.number().min(0)),

  cost: z.preprocess((val) => Number(val), z.number().min(0)),

  stock: z.preprocess(
    (val) => (val === undefined ? 0 : Number(val)),
    z.number().int().min(0),
  ),

  categoryId: z
    .string("Category ID is required")
    .uuid("Category ID must be a valid UUID"),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),

  description: z.string().optional(),

  price: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().min(0),
    )
    .optional(),

  cost: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().min(0),
    )
    .optional(),

  stock: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().int().min(0),
    )
    .optional(),

  categoryId: z
    .string("Category ID is required")
    .uuid("Category ID must be a valid UUID")
    .optional(),

  images: z
    .preprocess(
      (val) => {
        if (val === undefined) return undefined;
        if (val === null) return null;
        if (typeof val === "string") {
          const trimmed = val.trim();

          if (trimmed === "") return null;
          if (trimmed === "null") return null;

          return JSON.parse(trimmed);
        }
        return val;
      },
      z
        .array(
          z.object({
            url: z.string().url("Invalid image URL"),
            publicId: z.string().min(1, "Public ID is required"),
          }),
        )
        .nullable(),
    )
    .optional(),
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

export const productImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

export const productImagesSchema = z.array(productImageSchema);
