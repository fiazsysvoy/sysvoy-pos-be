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
import { ProductImage } from "../product/product.types.js";

export class CategoryService {
  async create({ user, data, file }: CreateCategoryParams) {
    const { organizationId } = user;

    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    return prismaClient.$transaction(async (tx) => {
      const existing = await tx.category.findUnique({
        where: {
          name_organizationId: {
            name: data.name,
            organizationId,
          },
        },
      });

      if (existing) {
        throw new HttpError("Category with this name already exists", 400);
      }

      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;

      if (file) {
        const result = await uploadImage(file.buffer, "categories");
        imageUrl = result.url;
        imagePublicId = result.publicId;
      }

      return tx.category.create({
        data: {
          ...data,
          imageUrl,
          imagePublicId,
          organization: {
            connect: { id: organizationId },
          },
        },
      });
    });
  }

  async getAll({ user, pageIndex, pageSize, search }: GetCategoriesOptions) {
    const skip = pageIndex * pageSize;
    const { organizationId } = user;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const where: PrismaTypes.CategoryWhereInput = {
      organizationId,
      ...(search && {
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
      }),
    };

    const [rawCategories, total] = await Promise.all([
      prismaClient.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      prismaClient.category.count({ where }),
    ]);

    const categories = rawCategories.map(({ _count, ...cat }) => ({
      ...cat,
      itemsCount: _count.products,
    }));

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

  async getById(user: any, id: string) {
    const { organizationId } = user;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    return await prismaClient.category.findUnique({
      where: { id, organizationId },
    });
  }

  async update({ user, id, data, file }: UpdateCategoryParams) {
    let uploadedImage: { url: string; publicId: string } | null = null;

    const { organizationId } = user;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    // Fetch category
    const category = await prismaClient.category.findUnique({
      where: { id, organizationId },
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

  async delete(user: any, id: string) {
    const { organizationId } = user;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    // check category
    const category = await prismaClient.category.findUnique({
      where: { id, organizationId },
      include: {
        products: { select: { id: true, images: true } },
      },
    });

    if (!category) {
      throw new HttpError("Category not found", 404);
    }

    // Delete image if exists
    if (category.imagePublicId) {
      await deleteImage(category.imagePublicId);
    }

    // delete images of products in this category
    const products = await prismaClient.product.findMany({
      where: { categoryId: id },
      select: { images: true },
    });
    for (const product of products) {
      const images = (product.images as ProductImage[]) || [];
      for (const image of images) {
        await deleteImage(image.publicId);
      }
    }

    // Delete category by id
    return await prismaClient.category.delete({
      where: { id },
    });
  }
}
