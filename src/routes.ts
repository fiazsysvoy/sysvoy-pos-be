import { Router } from "express";
import { requireAdmin } from "./middlewares/auth.middleware.js";
import authRouter from "./routes/auth.route.js";
import categoryRoutes from "./routes/category.route.js";
import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";

const router = Router();

// Auth routes
router.use("/auth", authRouter);

// Category routes
router.use("/categories", categoryRoutes);

// User routes
router.use("/users", requireAdmin, userRouter);

// Product routes
router.use("/products", productRouter);

export default router;
