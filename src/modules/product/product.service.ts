import { prismaClient } from "../../lib/prisma.js";
import {
  Prisma,
  Prisma as PrismaTypes,
} from "../../../generated/prisma/client.js";
import { User } from "../../../generated/prisma/client.js";
import { createProductSchema, updateProductSchema } from "./product.schema.js";
import { z } from "zod";
import { uploadImage, deleteImage } from "../../utils/uploadImage.js";
import {
  CreateProductParams,
  GetProductsOptions,
  UpdateProductParams,
} from "./product.types.js";
import { HttpError } from "../../utils/HttpError.js";

export class ProductService {
  async create({ user, data, files }: CreateProductParams) {
    let uploadedImages: { url: string; publicId: string }[] = [];

    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }
    const { categoryId, ...rest } = data;
    const category = await prismaClient.category.findUnique({
      where: { id: categoryId, organizationId },
    });

    if (!category) {
      throw new HttpError("Category not found", 404);
    }

    // Handle multiple file uploads
    if (files && files.length > 0) {
      for (const file of files) {
        const uploadedImage = await uploadImage(file.buffer, "products");
        uploadedImages.push(uploadedImage);
      }
    }

    try {
      return prismaClient.product.create({
        data: {
          ...rest,
          category: {
            connect: { id: categoryId },
          },
          organization: {
            connect: { id: organizationId },
          },
          ...(uploadedImages.length > 0 && {
            images: uploadedImages,
          }),
        },
      });
    } catch (e: any) {
      // Cleanup uploaded images if DB operation fails
      for (const image of uploadedImages) {
        await deleteImage(image.publicId);
      }
      throw e;
    }
  }

  async getAll({ pageIndex, pageSize, search, user }: GetProductsOptions) {
    const skip = pageIndex * pageSize;

    const where: PrismaTypes.ProductWhereInput | undefined = {
      organizationId: user.organizationId!,
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

    const [products, total] = await Promise.all([
      prismaClient.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
      prismaClient.product.count({ where }),
    ]);

    return {
      meta: {
        total,
        pageIndex,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
      data: products,
    };
  }

  getById(id: string, user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }
    return prismaClient.product.findUnique({
      where: { id, organizationId },
      include: { category: true },
    });
  }

  async update({ id, data, files, user }: UpdateProductParams) {
    let uploadedImages: { url: string; publicId: string }[] = [];
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    // Fetch product
    const product = await prismaClient.product.findUnique({
      where: { id, organizationId }, // Ensure product belongs to user's organization
    });

    if (!product) {
      throw new HttpError("Product not found", 404);
    }

    // Handle multiple file uploads
    if (files && files.length > 0) {
      for (const file of files) {
        const uploadedImage = await uploadImage(file.buffer, "products");
        uploadedImages.push(uploadedImage);
      }
    }
    console.log("Uploaded images:", uploadedImages);
    try {
      const updateData: Prisma.ProductUpdateInput = {};
      const currentImages = (product.images as any[]) || [];

      updateData.name = data.name;
      updateData.description = data.description;
      updateData.price = data.price;
      updateData.stock = data.stock;
      if (data.categoryId && data.categoryId !== product.categoryId) {
        updateData.category = {
          connect: { id: data.categoryId },
        };
      }

      // Handle images
      if (data.images !== undefined) {
        console.log("Images data:", data.images);
        if (data.images === null) {
          // Clear all images
          updateData.images = [];
        } else {
          // Replace with new images array
          updateData.images = [...uploadedImages, ...data.images];
        }
      } else if (uploadedImages.length > 0) {
        console.log("Adding uploaded images to existing ones");
        // Add uploaded images to existing ones
        updateData.images = [...currentImages, ...uploadedImages];
      }

      if (Object.keys(updateData).length === 0) {
        return product;
      }

      const updatedProduct = await prismaClient.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });

      // Delete old images AFTER DB success if clearing images
      if (data.images === null && currentImages.length > 0) {
        for (const image of currentImages) {
          if (image.publicId) {
            await deleteImage(image.publicId);
          }
        }
      }

      return updatedProduct;
    } catch (e: any) {
      // Cleanup newly uploaded images if DB failed
      for (const image of uploadedImages) {
        await deleteImage(image.publicId);
      }
      throw e;
    }
  }

  delete(id: string, user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const product = prismaClient.product.findUnique({
      where: { id, organizationId },
    });
    if (!product) {
      throw new HttpError("Product not found", 404);
    }

    return prismaClient.product.delete({
      where: { id },
    });
  }
}
