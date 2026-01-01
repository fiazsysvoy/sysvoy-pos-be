import { AuthService } from "./auth.service.js";
import { signinSchema, signupSchema } from "./auth.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const authService = new AuthService();

export const signup = asyncHandler(async (req, res) => {
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
});

export const signin = asyncHandler(async (req, res) => {
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
});
