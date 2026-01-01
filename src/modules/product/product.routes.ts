import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth.middleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";

const router = Router();

// Create product (admin only)
router.post("/", requireAdmin, createProduct);

// Get all products (paginated, searchable)
router.get("/", getProducts);

// Get product by ID
router.get("/:id", getProductById);

// Update product (admin only)
router.put("/:id", requireAdmin, updateProduct);

// Delete product (admin only)
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
