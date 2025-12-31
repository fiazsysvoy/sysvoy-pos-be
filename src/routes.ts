import { Router } from "express";
import { signup, signin, createUser } from "./auth/auth.controller.js";
import { requireAdmin } from "./middlewares/auth.middleware.js";
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "./users/user.controller.js";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "./categories/category.controller.js";
import {
  createProduct,
  deleteProduct,
  getProducts,
  getProductById,
  updateProduct,
} from "./product/product.controller.js";
import { upload } from "./middlewares/multer.js";
import { uploadImage } from "./utils/uploadImage.js";
import { safeUpload } from "./middlewares/safeUpload.js";

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const result = await uploadImage(req.file.buffer, "products");

    console.log("Cloudinary URL:", result.url);

    return res.json({
      message: "Image uploaded successfully",
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Upload failed" });
  }
});

router.post(
  "/upload-many",
  safeUpload(upload.array("images", 5)),
  async (req, res) => {
    // console.log("Files received:", req.files);
    // if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    //   return res.status(400).json({ message: "No images provided" });
    // }
    const results = await Promise.all(
      (req.files as Express.Multer.File[]).map((f) => uploadImage(f.buffer)),
    );
    console.log(results)
    console.log(
      "Cloudinary URLs:",
      results.map((r) => r.url),
    );
    res.json(results);
  },
);

// Admin route to create users
router.post("/users", requireAdmin, createUser);

router.get("/users", requireAdmin, getUsers);
router.get("/users/:id", requireAdmin, getUserById);
router.put("/users/:id", requireAdmin, updateUser);
router.delete("/users/:id", requireAdmin, deleteUser);

// Category routes
router.post("/categories", requireAdmin, safeUpload(upload.single("image")), createCategory);
router.get("/categories", requireAdmin, getCategories);
router.get("/categories/:id", requireAdmin, getCategoryById);
router.put("/categories/:id", requireAdmin, updateCategory);
router.delete("/categories/:id", requireAdmin, deleteCategory);

// Category routes
router.post("/products", requireAdmin, createProduct);
router.get("/products", requireAdmin, getProducts);
router.get("/products/:id", requireAdmin, getProductById);
router.put("/products/:id", requireAdmin, updateProduct);
router.delete("/products/:id", requireAdmin, deleteProduct);

export default router;
