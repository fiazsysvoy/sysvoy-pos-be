import { Router } from "express";
import * as AccountController from "./account.controller.js";

const router = Router();

// Get profile
router.get("/", AccountController.getMyProfile);

// Update profile
router.put("/", AccountController.updateMyProfile);

export default router;
