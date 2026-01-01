import { prismaClient } from "../../lib/prisma.js";
import {
  Prisma,
  Prisma as PrismaTypes,
} from "../../../generated/prisma/client.js";
import { HttpError } from "../../utils/HttpError.js";
import { uploadImage, deleteImage } from "../../utils/uploadImage.js";
import {
  CreateCategoryParams,
  GetCategoriesOptions,
  UpdateCategoryParams,
} from "./category.types.js";

export class CategoryService {
  async create({ user, data, file }: CreateCategoryParams) {
    return prismaClient.$transaction(async (tx) => {
      // Check if category exists
      const existing = await tx.category.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new HttpError("Category with this name already exists", 400);
      }

      // Upload image if provided
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

  async getById(id: string) {
    return await prismaClient.category.findUnique({
      where: { id },
    });
  }

  async update({ id, data, file }: UpdateCategoryParams) {
    let uploadedImage: { url: string; publicId: string } | null = null;

    // Fetch category
    const category = await prismaClient.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new HttpError("Category not found", 404);
    }

    // Fast duplicate check
    if (data.name && data.name !== category.name) {
      const exists = await prismaClient.category.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (exists) {
        throw new HttpError("Category name already exists", 409);
      }
    }

    // Upload image AFTER validation
    if (file) {
      uploadedImage = await uploadImage(file.buffer, "categories");
    }

    try {
      const updateData: Prisma.CategoryUpdateInput = {};

      if (data.name && data.name !== category.name) {
        updateData.name = data.name;
      }
      updateData.description = data.description;

      if (file) {
        updateData.imageUrl = uploadedImage!.url;
        updateData.imagePublicId = uploadedImage!.publicId;
      } else if (data.imageUrl === null) {
        updateData.imageUrl = null;
        updateData.imagePublicId = null;
      }

      if (Object.keys(updateData).length === 0) {
        return category;
      }

      const updatedCategory = await prismaClient.category.update({
        where: { id },
        data: updateData,
      });

      // Delete old image AFTER DB success
      if ((file || data.imageUrl === null) && category.imagePublicId) {
        await deleteImage(category.imagePublicId);
      }

      return updatedCategory;
    } catch (e: any) {
      // Cleanup newly uploaded image if DB failed
      if (uploadedImage) {
        await deleteImage(uploadedImage.publicId);
      }

      // Safety net for race condition
      if (e.code === "P2002") {
        throw new HttpError("Category name already exists", 409);
      }

      throw e;
    }
  }

  async delete(id: string) {
    // check category
    const category = await prismaClient.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new HttpError("Category not found", 404);
    }

    // Delete category by id
    return await prismaClient.category.delete({
      where: { id },
    });
  }
}
