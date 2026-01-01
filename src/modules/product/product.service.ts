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

export class ProductService {
  async create({ user, data, files }: CreateProductParams) {
    let uploadedImages: { url: string; publicId: string }[] = [];

    // Handle multiple file uploads
    if (files && files.length > 0) {
      for (const file of files) {
        const uploadedImage = await uploadImage(file.buffer, "products");
        uploadedImages.push(uploadedImage);
      }
    }

    try {
      const { categoryId, ...rest } = data;

      return prismaClient.product.create({
        data: {
          ...rest,
          category: {
            connect: { id: categoryId },
          },
          createdBy: {
            connect: { id: user.id },
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

  async getAll({ pageIndex, pageSize, search }: GetProductsOptions) {
    const skip = pageIndex * pageSize;

    const where: PrismaTypes.ProductWhereInput | undefined = search
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

  getById(id: string) {
    return prismaClient.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async update({ id, data, files }: UpdateProductParams) {
    let uploadedImages: { url: string; publicId: string }[] = [];

    // Fetch product
    const product = await prismaClient.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error("Product not found");
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

  delete(id: string) {
    return prismaClient.product.delete({
      where: { id },
    });
  }
}
