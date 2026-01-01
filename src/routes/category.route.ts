import { Router } from "express";
import * as categoryController from "../categories/category.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { safeUpload } from "../middlewares/safeUpload.js";
import { upload } from "../middlewares/multer.js";

const categoryRouter = Router();

// POST /categories
categoryRouter.post(
  "/",
  requireAdmin,
  safeUpload(upload.single("image")),
  categoryController.createCategory,
);

// GET /categories
categoryRouter.get("/", categoryController.getCategories);

// GET /categories/:id
categoryRouter.get("/:id", categoryController.getCategoryById);

// PATCH /categories/:id
categoryRouter.patch(
  "/:id",
  requireAdmin,
  safeUpload(upload.single("image")),
  categoryController.updateCategory,
);

// DELETE /categories/:id
categoryRouter.delete("/:id", requireAdmin, categoryController.deleteCategory);

export default categoryRouter;
