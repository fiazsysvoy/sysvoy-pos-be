import { z } from "zod";

export const categoryIdParamSchema = z.object({
    id: z.string().uuid("Invalid category id"),
});

export const createCategorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
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
