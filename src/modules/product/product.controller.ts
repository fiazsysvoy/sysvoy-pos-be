import { Request, Response } from "express";
import { ProductService } from "./product.service.js";
import {
  createProductSchema,
  getProductsQuerySchema,
  updateProductSchema,
  productIdParamSchema,
} from "./product.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const productService = new ProductService();

// POST /products
export const createProduct = asyncHandler(async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const product = await productService.create({
    user: req.user!,
    data: parsed.data,
    files: req.files as Express.Multer.File[],
  });
  res.status(201).json(product);
});

// GET /products
export const getProducts = asyncHandler(async (req, res) => {
  const parsed = getProductsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  const { pageIndex, pageSize, search } = parsed.data;

  const result = await productService.getAll({
    user: req.user!,
    pageIndex,
    pageSize,
    search,
  });
  res.json(result);
});

// GET /products/:id
export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = productIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    const product = await productService.getById(parsed.data.id, req.user!);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  },
);

// PUT /products/:id
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const paramsParsed = productIdParamSchema.safeParse(req.params);
    const bodyParsed = updateProductSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      return res.status(400).json({
        errors: [
          ...(paramsParsed.error?.issues ?? []),
          ...(bodyParsed.error?.issues ?? []),
        ],
      });
    }

    const product = await productService.update({
      user: req.user!,
      id: paramsParsed.data.id,
      data: bodyParsed.data,
      files: req.files as Express.Multer.File[],
    });
    res.json({ message: "Product updated", product });
  },
);

// DELETE /products/:id
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = productIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i: any) => i.message) });
    }

    await productService.delete(parsed.data.id, req.user!);
    res.status(204).send();
  },
);

// GET /products/low-stock
export const getLowStockProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.getLowStockProducts(req.user!);
    res.json({ success: true, data: result });
  },
);
