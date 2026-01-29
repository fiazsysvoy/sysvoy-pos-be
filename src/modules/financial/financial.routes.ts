import { Router } from "express";
import * as financialController from "./financial.controller.js";

const router = Router();

// Get financial statistics with date range
router.get("/stats", financialController.getFinancialStats);

// Get all products report (profit, margin, quantity sold) with date range
router.get("/products", financialController.getFinancialProducts);

export default router;

