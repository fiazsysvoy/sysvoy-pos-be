import z from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6).max(100),
});

export const signinSchema =  z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6).max(100),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, "Verification code is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
