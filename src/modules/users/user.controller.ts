import { Request, Response } from "express";
import { UserService } from "./user.service.js";
import {
  getUsersQuerySchema,
  updateUserSchema,
  createUserSchema,
  userIdParamSchema,
} from "./user.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const userService = new UserService();

// GET /users
export const getUsers = asyncHandler(async (req, res) => {
  const parsed = getUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const { pageIndex, pageSize, search } = parsed.data;

  const result = await userService.getAll({
    pageIndex,
    pageSize,
    search,
  });
  res.json(result);
});

// GET /users/:id
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const parsed = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const user = await userService.getById(parsed.data.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
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
    const user = await userService.createUser(email, password, name, role);
    res.status(201).json({ message: "User created successfully", user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /users/:id
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const paramsParsed = userIdParamSchema.safeParse(req.params);
  const bodyParsed = updateUserSchema.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    return res.status(400).json({
      errors: [
        ...(paramsParsed.error?.issues ?? []),
        ...(bodyParsed.error?.issues ?? []),
      ],
    });
  }

  const user = await userService.update(paramsParsed.data.id, bodyParsed.data);

  res.status(200).json({ message: "User updated", user });
});

// DELETE /users/:id
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  await userService.delete(parsed.data.id);
  res.status(204).send();
});
