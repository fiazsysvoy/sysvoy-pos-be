import { Request, Response } from "express";
import { ProductService } from "./product.service.js";
import {
  createProductSchema,
  getProductsQuerySchema,
  updateProductSchema,
  productIdParamSchema,
} from "./product.schema.js";

const productService = new ProductService();

// POST /products
export const createProduct = async (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const product = await productService.create(req.user!, parsed.data);
  res.status(201).json(product);
};

// GET /products
export const getProducts = async (req: Request, res: Response) => {
  const parsed = getProductsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  const { pageIndex, pageSize, search } = parsed.data;

  const result = await productService.getAll({
    pageIndex,
    pageSize,
    search,
  });
  res.json(result);
};

// GET /products/:id
export const getProductById = async (req: Request, res: Response) => {
  const parsed = productIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  const product = await productService.getById(parsed.data.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
};

// PUT /products/:id
export const updateProduct = async (req: Request, res: Response) => {
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

  const product = await productService.update(
    paramsParsed.data.id,
    bodyParsed.data,
  );
  res.json({ message: "Product updated", product });
};

// DELETE /products/:id
export const deleteProduct = async (req: Request, res: Response) => {
  const parsed = productIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i: any) => i.message) });
  }

  await productService.delete(parsed.data.id);
  res.status(204).send();
};
