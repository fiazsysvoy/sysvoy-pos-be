import bcrypt from "bcrypt";
import { prismaClient } from "../lib/prisma.js";
import { Prisma as PrismaTypes } from "../../generated/prisma/client.js"; // for types

interface GetUsersOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
}

export class UserService {
  async getAll({ pageIndex, pageSize, search }: GetUsersOptions) {
    const skip = pageIndex * pageSize; // 0-based pageIndex

    const where: PrismaTypes.UserWhereInput | undefined = search
      ? {
          OR: [
            {
              email: {
                contains: search,
                mode: PrismaTypes.QueryMode.insensitive,
              },
            },
            {
              name: {
                contains: search,
                mode: PrismaTypes.QueryMode.insensitive,
              },
            },
          ],
        }
      : undefined;

    const [users, total] = await Promise.all([
      prismaClient.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
      prismaClient.user.count({ where }),
    ]);

    return {
      meta: {
        total,
        pageIndex,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
      data: users,
    };
  }

  getById(id: string) {
    return prismaClient.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return prismaClient.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async delete(id: string) {
    await prismaClient.user.delete({ where: { id } });
  }
}
