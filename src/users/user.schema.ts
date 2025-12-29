import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
});

export const getUsersQuerySchema = z.object({
  pageIndex: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 0)) // 0-based index
    .refine((v) => v >= 0, "pageIndex must be >= 0"),

  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 10))
    .refine((v) => v > 0 && v <= 100, "pageSize must be 1–100"),

  search: z.string().optional(),
});
