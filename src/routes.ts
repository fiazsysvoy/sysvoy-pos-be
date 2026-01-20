import { Router } from "express";
import { requireAuth } from "./middlewares/auth.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import userRouter from "./modules/users/user.routes.js";
import accountRouter from "./modules/account/account.routes.js";
import productRouter from "./modules/product/product.routes.js";
import orderRouter from "./modules/orders/order.routes.js";
import webhookRouter from "./modules/webhooks/webhook.routes.js";

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

// Webhook routes (no global auth, uses custom secret guard)
router.use("/webhooks", webhookRouter);

export default router;
