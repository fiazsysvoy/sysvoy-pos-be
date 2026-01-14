import { Router } from "express";
import {
  signup,
  signin,
  verifyEmail,
  resendVerification,
  createOrganization,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/create-organization", requireAuth, createOrganization);

router.post("/signin", signin);
router.post("/change-password", requireAuth, changePassword);

router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);

export default router;
