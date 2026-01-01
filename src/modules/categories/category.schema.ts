import { z } from "zod";

export const categoryIdParamSchema = z.object({
  id: z.string("id must be string").uuid("Invalid category id"),
});

export const createCategorySchema = z.object({
  name: z.string("Name must be string").min(1, "Name is required"),
  description: z.string("Description must be string").optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),

  imageUrl: z
    .string()
    .url("Invalid image URL")
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

export const getCategoriesQuerySchema = z.object({
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
