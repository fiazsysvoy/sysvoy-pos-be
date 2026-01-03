import { Router } from "express";
import { requireAdmin } from "./middlewares/auth.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import userRouter from "./modules/users/user.routes.js";
import productRouter from "./modules/product/product.routes.js";
import orderRouter from "./modules/orders/order.routes.js";

const router = Router();

// Auth routes
router.use("/auth", authRouter);

// Category routes
router.use("/categories", categoryRoutes);

// User routes
router.use("/users", requireAdmin, userRouter);

// Product routes
router.use("/products", productRouter);

// order routes
router.use("/orders", requireAdmin, orderRouter);

export default router;
