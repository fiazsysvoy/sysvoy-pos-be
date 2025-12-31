import { Request, Response } from "express";
import { UserService } from "./user.service.js";
import {
  getUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "./user.schema.js";
import { HttpError } from "../utils/HttpError.js";

const userService = new UserService();

// GET /users
export const getUsers = async (req: Request, res: Response) => {
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
};

// GET /users/:id
export const getUserById = async (req: Request, res: Response) => {
  const parsed = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const user = await userService.getById(parsed.data.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};

// PUT /users/:id
export const updateUser = async (req: Request, res: Response) => {
  try {
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

    const user = await userService.update(
      paramsParsed.data.id,
      bodyParsed.data,
    );

    res.status(200).json({ message: "User updated", user });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const parsed = userIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }

    await userService.delete(parsed.data.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
