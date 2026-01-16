import { Router } from "express";
import * as UserController from "./user.controller.js";

const router = Router();

// Get all users (admin only)
router.get("/", UserController.getUsers);

// Get user by ID (admin only)
router.get("/:id", UserController.getUserById);

// Create user (admin only)
router.post("/", UserController.createUser);

// Update user (admin only)
router.put("/:id", UserController.updateUser);

// Delete user (admin only)
router.delete("/:id", UserController.deleteUser);

export default router;
