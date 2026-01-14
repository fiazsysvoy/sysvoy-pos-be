import { Router } from "express";
import { safeUpload } from "../../middlewares/safeUpload.js";
import { upload } from "../../middlewares/multer.js";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";

const router = Router();

// Create category (admin only, with image upload)
router.post("/", safeUpload(upload.single("image")), createCategory);

// Get all categories (paginated, searchable)
router.get("/", getCategories);

// Get category by ID
router.get("/:id", getCategoryById);

// Update category (admin only)
router.patch("/:id", safeUpload(upload.single("image")), updateCategory);

// Delete category (admin only)
router.delete("/:id", deleteCategory);

export default router;
