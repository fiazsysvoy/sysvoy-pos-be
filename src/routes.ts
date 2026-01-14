import { Router } from "express";
import { requireAuth } from "./middlewares/auth.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import userRouter from "./modules/users/user.routes.js";
import productRouter from "./modules/product/product.routes.js";
import orderRouter from "./modules/orders/order.routes.js";

const router = Router();

// Auth routes
router.use("/auth", authRouter);

// Category routes
router.use("/categories", requireAuth, categoryRoutes);

// User routes
router.use("/users", requireAuth, userRouter);

// Product routes
router.use("/products", requireAuth, productRouter);

// order routes
router.use("/orders", requireAuth, orderRouter);

export default router;
