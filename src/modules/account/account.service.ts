import { prismaClient } from "../../lib/prisma.js";
import { User } from "../../../generated/prisma/client.js";
import { HttpError } from "../../utils/HttpError.js";

export class AccountService {
  async getProfile(user: User) {
    return await prismaClient.user.findUnique({
      where: { id: user.id, organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async updateProfile(user: User, data: { name: string }) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    return await prismaClient.user.update({
      where: { id: user.id, organizationId },
      data: { name: data.name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });
  }

  async getOrganization(user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    return await prismaClient.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        lowStockThreshold: true,
      },
    });
  }

  async updateOrganization(user: User, data: { lowStockThreshold?: number }) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    // Only admins can update organization settings
    if (user.role !== "ADMIN") {
      throw new HttpError("Only admins can update organization settings", 403);
    }

    const updateData: any = {};
    if (data.lowStockThreshold !== undefined) {
      if (data.lowStockThreshold < 0) {
        throw new HttpError(
          "Low stock threshold must be a positive number",
          400,
        );
      }
      updateData.lowStockThreshold = data.lowStockThreshold;
    }

    return await prismaClient.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        lowStockThreshold: true,
      },
    });
  }
}
