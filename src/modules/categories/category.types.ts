import { z } from "zod";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.schema.js";
import { User } from "../../../generated/prisma/client.js";

export interface GetCategoriesOptions {
  user: User;
  pageIndex: number;
  pageSize: number;
  search?: string;
}
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;

export interface CreateCategoryParams {
  user: User;
  data: CreateCategoryDTO;
  file?: Express.Multer.File; // pass file buffer here
}

export interface UpdateCategoryParams {
  id: string;
  user: User;
  data: UpdateCategoryDTO;
  file?: Express.Multer.File; // new image file
}
