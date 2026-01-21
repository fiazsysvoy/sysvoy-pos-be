import { Router } from "express";
import { WebhookController } from "./webhook.controller.js";
import { requireWebhookSecret } from "./webhook.guard.js";

const router = Router();
const controller = new WebhookController();

router.post("/orders", requireWebhookSecret, controller.handleOrder);
router.post("/cancel", requireWebhookSecret, controller.handleCancellation);

export default router;
