import bcrypt from "bcrypt";
import { prismaClient } from "../../lib/prisma.js";
import {
  Prisma as PrismaTypes,
  User,
} from "../../../generated/prisma/client.js"; // for types
import { HttpError } from "../../utils/HttpError.js";

interface GetUsersOptions {
  pageIndex: number;
  user: User;
  pageSize: number;
  search?: string;
}

export class UserService {
  async getAll({ pageIndex, pageSize, search, user }: GetUsersOptions) {
    const skip = pageIndex * pageSize; // 0-based pageIndex
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const where: PrismaTypes.UserWhereInput | undefined = {
      organizationId,
      ...(search && {
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
      }),
    };

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

  async getById(id: string, user?: User) {
    const organizationId = user?.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }
    return await prismaClient.user.findUnique({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async createUser(
    user: User,
    email: string,
    password: string,
    name?: string,
    role?: "ADMIN" | "STAFF",
  ) {
    const existingUser = await prismaClient.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new HttpError("User already exists", 409);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prismaClient.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "STAFF",
        organizationId: user.organizationId!,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return newUser;
  }

  async update(id: string, data: any, user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const existingUser = await prismaClient.user.findUnique({
      where: { id, organizationId },
    });

    if (!existingUser) {
      throw new HttpError("User not found", 404);
    }

    return prismaClient.$transaction(async (tx) => {
      // If email is being updated, check uniqueness
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await tx.user.findFirst({
          where: {
            email: data.email,
            NOT: { id }, // exclude current user
          },
        });

        if (emailExists) {
          throw new HttpError("Email already in use", 409);
        }
      }

      // Hash password if present
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      // Update user
      return tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    });
  }

  async delete(id: string, user: User) {
    // check if user exists
    const existingUser = await this.getById(id, user);
    if (!existingUser) {
      throw new HttpError("User not found", 404);
    }

    await prismaClient.user.delete({
      where: { id, organizationId: user.organizationId },
    });
  }
}
