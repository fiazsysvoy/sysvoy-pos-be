import { Router } from "express";
import { signup, signin, createUser } from "./auth/auth.controller.js";
import { requireAdmin } from "./middlewares/auth.middleware.js";

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);


// Admin route to create users
router.post('/users', requireAdmin, createUser);

export default router;
