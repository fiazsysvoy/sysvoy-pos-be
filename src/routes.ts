import { Router } from "express";
import { signup, signin, createUser } from "./auth/auth.controller.js";
import { requireAdmin } from "./middlewares/auth.middleware.js";
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "./users/user.controller.js";

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

// Admin route to create users
router.post("/users", requireAdmin, createUser);

router.get("/users", requireAdmin, getUsers);
router.get("/users/:id", requireAdmin, getUserById);
router.put("/users/:id", requireAdmin, updateUser);
router.delete("/users/:id", requireAdmin, deleteUser);

export default router;
