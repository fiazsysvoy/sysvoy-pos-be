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
router.get("/", getUsers);

// Get user by ID (admin only)
router.get("/:id", getUserById);

// Create user (admin only)
router.post("/", createUser);

// Update user (admin only)
router.put("/:id", updateUser);

// Delete user (admin only)
router.delete("/:id", deleteUser);

export default router;
