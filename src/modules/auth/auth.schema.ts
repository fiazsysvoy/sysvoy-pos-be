import z from "zod";

export const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6).max(100),
});

export const signinSchema = signupSchema.extend({});
