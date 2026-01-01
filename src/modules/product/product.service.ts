import { prismaClient } from "../../lib/prisma.js";
import { Prisma as PrismaTypes } from "../../../generated/prisma/client.js";
import { User } from "../../../generated/prisma/client.js";
import { createProductSchema, updateProductSchema } from "./product.schema.js";
import { z } from "zod";

interface GetProductsOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
}

type CreateProductDTO = z.infer<typeof createProductSchema>;
type UpdateProductDTO = z.infer<typeof updateProductSchema>;

export class ProductService {
  async create(user: User, data: CreateProductDTO) {
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
      },
    });
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

  update(id: string, data: UpdateProductDTO) {
    const { categoryId, ...rest } = data;

    return prismaClient.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId && {
          category: {
            connect: { id: categoryId },
          },
        }),
      },
      include: { category: true },
    });
  }

  delete(id: string) {
    return prismaClient.product.delete({
      where: { id },
    });
  }
}
