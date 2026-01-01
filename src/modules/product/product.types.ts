import { z } from "zod";
import { createProductSchema, updateProductSchema } from "./product.schema.js";
import { User } from "../../../generated/prisma/client.js";

export interface GetProductsOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
}

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;

export interface CreateProductParams {
  user: User;
  data: CreateProductDTO;
  files?: Express.Multer.File[]; // Support multiple files
}

export interface UpdateProductParams {
  id: string;
  data: UpdateProductDTO;
  files?: Express.Multer.File[]; // Support multiple files
}
