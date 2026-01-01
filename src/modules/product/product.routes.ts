import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth.middleware.js";
import { safeUpload } from "../../middlewares/safeUpload.js";
import { upload } from "../../middlewares/multer.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";

const router = Router();

// Create product (admin only, with multiple image upload)
router.post(
  "/",
  requireAdmin,
  safeUpload(upload.array("prodImages", 5)), // Support up to 5 images
  createProduct,
);

// Get all products (paginated, searchable)
router.get("/", getProducts);

// Get product by ID
router.get("/:id", getProductById);

// Update product (admin only, with multiple image upload)
router.patch(
  "/:id",
  requireAdmin,
  safeUpload(upload.array("prodImages", 5)), // Support up to 5 images
  updateProduct,
);

// Delete product (admin only)
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
