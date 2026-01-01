import { Request, Response } from "express";
import { CategoryService } from "./category.service.js";
import {
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "./category.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const categoryService = new CategoryService();

// POST /categories
export const createCategory = asyncHandler(async (req, res) => {
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
});

// GET /categories
export const getCategories = asyncHandler(async (req, res) => {
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
});

// GET /categories/:id
export const getCategoryById = asyncHandler(async (req, res) => {
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
});

// PUT /categories/:id
export const updateCategory = asyncHandler(async (req, res) => {
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

  const category = await categoryService.update({
    id: paramsParsed.data.id,
    data: bodyParsed.data,
    file: req.file,
  });
  res.json({ message: "Category updated", category });
});

// DELETE /categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  const parsed = categoryIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  await categoryService.delete(parsed.data.id);
  res.status(204).send();
});
