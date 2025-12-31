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

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

// Admin route to create users
router.post("/users", requireAdmin, createUser);

router.get("/users", requireAdmin, getUsers);
router.get("/users/:id", requireAdmin, getUserById);
router.put("/users/:id", requireAdmin, updateUser);
router.delete("/users/:id", requireAdmin, deleteUser);

// Category routes
router.post("/categories", requireAdmin, createCategory);
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
