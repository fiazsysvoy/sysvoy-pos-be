import { Router } from "express";
import * as paymentController from "./payment.controller.js";

const router = Router();

// Initiate payment
router.post("/initiate", paymentController.initiatePayment);

// Verify payment status
router.get("/verify", paymentController.verifyPayment);

// Refund payment
router.post("/refund", paymentController.refundPayment);

export default router;

