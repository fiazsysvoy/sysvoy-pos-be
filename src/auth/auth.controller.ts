import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { signinSchema, signupSchema } from "./auth.schema.js";
import { createUserSchema } from "./user.schema.js";

const authService = new AuthService();

export const signup = async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      // detailed error messages from Zod
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((issue) => issue.message) });
    }

    const { email, password } = parsed.data;

    const user = await authService.signup(email, password);

    res.status(201).json({ message: "User created successfully", user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) {
      // detailed error messages from Zod
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((issue) => issue.message) });
    }

    const { email, password } = parsed.data;
    const data = await authService.signin(email, password);
    res.json(data);
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      // detailed error messages from Zod
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((issue) => issue.message) });
    }
    const { email, password, name, role } = parsed.data;

    // Create user
    const user = await authService.createUser(email, password, name, role);
    res.status(201).json({ message: "User created successfully", user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
