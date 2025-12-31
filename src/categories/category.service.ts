import { prismaClient } from "../lib/prisma.js";
import { Prisma as PrismaTypes } from "../../generated/prisma/client.js";
import { User } from "../../generated/prisma/client.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.schema.js";
import { z } from "zod";
import { HttpError } from "../utils/HttpError.js";
import { uploadImage } from "../utils/uploadImage.js";

interface GetCategoriesOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
}
type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;

interface CreateCategoryParams {
  user: User;
  data: CreateCategoryDTO;
  file?: Express.Multer.File; // pass file buffer here
}

export class CategoryService {
  async create({ user, data, file }: CreateCategoryParams) {
    return prismaClient.$transaction(async (tx) => {
      // 1️⃣ Check if category exists
      const existing = await tx.category.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new HttpError("Category with this name already exists", 400);
      }

      // 2️⃣ Upload image if provided
      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;

      if (file) {
        const result = await uploadImage(file.buffer, "categories");
        imageUrl = result.url;
        imagePublicId = result.publicId;
      }

      const category = await tx.category.create({
        data: {
          ...data,
          imageUrl,
          imagePublicId,
          createdBy: { connect: { id: user.id } },
        },
      });

      return category;
    });
  }

  async getAll({ pageIndex, pageSize, search }: GetCategoriesOptions) {
    const skip = pageIndex * pageSize;

    const where: PrismaTypes.CategoryWhereInput | undefined = search
      ? {
        OR: [
          {
            name: {
              contains: search,
              mode: PrismaTypes.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: search,
              mode: PrismaTypes.QueryMode.insensitive,
            },
          },
        ],
      }
      : undefined;

    const [categories, total] = await Promise.all([
      prismaClient.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prismaClient.category.count({ where }),
    ]);

    return {
      meta: {
        total,
        pageIndex,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
      data: categories,
    };
  }

  getById(id: string) {
    return prismaClient.category.findUnique({
      where: { id },
    });
  }

  update(id: string, data: UpdateCategoryDTO) {
    return prismaClient.category.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return prismaClient.category.delete({
      where: { id },
    });
  }
}
