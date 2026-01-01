import { Router } from "express";
import { requireAdmin } from "../../middlewares/auth.middleware.js";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "./user.controller.js";

const router = Router();

// Get all users (admin only)
router.get("/", requireAdmin, getUsers);

// Get user by ID (admin only)
router.get("/:id", requireAdmin, getUserById);

// Create user (admin only)
router.post("/", requireAdmin, createUser);

// Update user (admin only)
router.put("/:id", requireAdmin, updateUser);

// Delete user (admin only)
router.delete("/:id", requireAdmin, deleteUser);

export default router;
