import { Request, Response } from "express";
import { CategoryService } from "./category.service.js";
import {
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "./category.schema.js";
import { HttpError } from "../utils/HttpError.js";

const categoryService = new CategoryService();

// POST /categories
export const createCategory = async (req: Request, res: Response) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    const category = await categoryService.create({
      user: req.user!,
      data: parsed.data,
      file: req.file, // pass multer file directly
    });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /categories
export const getCategories = async (req: Request, res: Response) => {
  const parsed = getCategoriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  const { pageIndex, pageSize, search } = parsed.data;

  const result = await categoryService.getAll({
    pageIndex,
    pageSize,
    search,
  });
  res.json(result);
};

// GET /categories/:id
export const getCategoryById = async (req: Request, res: Response) => {
  const parsed = categoryIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  const category = await categoryService.getById(parsed.data.id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json(category);
};

// PUT /categories/:id
export const updateCategory = async (req: Request, res: Response) => {
  const paramsParsed = categoryIdParamSchema.safeParse(req.params);
  const bodyParsed = updateCategorySchema.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    const errors = [
      ...(paramsParsed.error?.issues ?? []),
      ...(bodyParsed.error?.issues ?? []),
    ];
    return res.status(400).json({
      errors: errors.map((i: any) => i.message),
    });
  }

  const category = await categoryService.update(
    paramsParsed.data.id,
    bodyParsed.data,
  );
  res.json({ message: "Category updated", category });
};

// DELETE /categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const parsed = categoryIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    await categoryService.delete(parsed.data.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
