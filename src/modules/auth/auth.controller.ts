import { AuthService } from "./auth.service.js";
import {
  signinSchema,
  signupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  createOrganizationSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "./auth.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const authService = new AuthService();

export const signup = asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((issue) => issue.message) });
  }
  const { name, email, password } = parsed.data;
  const user = await authService.signup(name, email, password);
  res.status(201).json({
    message: "User created successfully. Please verify your email.",
    user,
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }
  const { email, code } = parsed.data;
  const user = await authService.verifyEmail(email, code);
  const accessToken = await authService.generateJwt(user.id);
  const refreshToken = await authService.generateRefreshToken(user.id);
  res.json({ message: "Email verified successfully", user, accessToken, refreshToken });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }
  const result = await authService.resendVerification(parsed.data.email);
  res.json(result);
});

export const createOrganization = asyncHandler(async (req, res) => {
  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const org = await authService.createOrganization(userId, parsed.data.name);
  res.status(201).json({ message: "Organization created", organization: org });
});

export const signin = asyncHandler(async (req, res) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((issue) => issue.message) });
  }
  const { email, password } = parsed.data;
  const data = await authService.signin(email, password);
  res.json(data);
});

export const changePassword = asyncHandler(async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const result = await authService.changePassword(
    userId,
    parsed.data.oldPassword,
    parsed.data.newPassword,
  );
  res.json(result);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  const result = await authService.forgotPassword(parsed.data.email);
  res.json(result);
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Token is required" });
  const result = await authService.verifyResetToken(token);
  res.json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  const result = await authService.resetPassword(
    parsed.data.token,
    parsed.data.newPassword,
  );
  res.json(result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const parsed = refreshTokenSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });

  const result = await authService.refreshAccessToken(parsed.data.refreshToken);
  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const result = await authService.logout(userId);
  res.json(result);
});

