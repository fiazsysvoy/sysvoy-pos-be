import { Router } from "express";
import * as AccountController from "./account.controller.js";

const router = Router();

// Get profile
router.get("/", AccountController.getMyProfile);

// Update profile
router.put("/", AccountController.updateMyProfile);

// Get organization settings
router.get("/organization", AccountController.getOrganization);

// Update organization settings (admin only)
router.put("/organization", AccountController.updateOrganization);

export default router;
