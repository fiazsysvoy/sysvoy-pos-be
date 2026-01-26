import { Router } from "express";
import * as financialController from "./financial.controller.js";

const router = Router();

// Get financial statistics with date range
router.get("/stats", financialController.getFinancialStats);

export default router;

