import { prismaClient } from "../lib/prisma.js";
import { Prisma as PrismaTypes } from "../../generated/prisma/client.js";
import { User } from "../../generated/prisma/client.js";
import { createCategorySchema, updateCategorySchema } from "./category.schema.js";
import { z } from "zod";

interface GetCategoriesOptions {
    pageIndex: number;
    pageSize: number;
    search?: string;
}
type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;

export class CategoryService {
    async create(user: User, data: CreateCategoryDTO) {
        return prismaClient.category.create({
            data: {
                ...data,
                createdBy: {
                    connect: { id: user.id },
                },
            },
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
