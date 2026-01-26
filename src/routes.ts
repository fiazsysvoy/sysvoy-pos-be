import { Router } from "express";
import { requireAdmin, requireAuth } from "./middlewares/auth.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import userRouter from "./modules/users/user.routes.js";
import accountRouter from "./modules/account/account.routes.js";
import productRouter from "./modules/product/product.routes.js";
import orderRouter from "./modules/orders/order.routes.js";
import paymentRouter from "./modules/payments/payment.routes.js";
import * as paymentController from "./modules/payments/payment.controller.js";
import webhookRouter from "./modules/webhooks/webhook.routes.js";
import integrationRouter from "./modules/integration/integration.routes.js";
import teamIntegrationRouter from "./modules/team-integration/team-integration.routes.js";
import financialRouter from "./modules/financial/financial.routes.js";

const router = Router();

// Auth routes
router.use("/auth", authRouter);

// Category routes
router.use("/categories", requireAuth, categoryRoutes);

// User routes
router.use("/users", requireAuth, userRouter);

// Account routes
router.use("/account", requireAuth, accountRouter);

// Product routes
router.use("/products", requireAuth, productRouter);

// order routes
router.use("/orders", requireAuth, orderRouter);

// Payment callback (public endpoint for gateways)
router.post("/payments/callback", paymentController.paymentCallback);

// Payment routes (protected)
router.use("/payments", requireAuth, paymentRouter);

// Integration routes
router.use("/integrations", requireAdmin, integrationRouter);

// Team Integration routes
router.use("/team-integrations", requireAuth, teamIntegrationRouter);

// Webhook routes (no global auth, uses custom secret guard)
router.use("/webhooks", webhookRouter);

// Financial routes
router.use("/financial", requireAuth, financialRouter);

export default router;
