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
