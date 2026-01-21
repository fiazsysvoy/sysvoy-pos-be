import { prismaClient } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

export class IntegrationService {
    async create(data: Prisma.IntegrationCreateInput) {
        return prismaClient.integration.create({
            data,
        });
    }

    async update(id: string, data: Prisma.IntegrationUpdateInput) {
        return prismaClient.integration.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return prismaClient.integration.delete({
            where: { id },
        });
    }

    async getAll() {
        return prismaClient.integration.findMany({
            orderBy: { createdAt: "desc" },
        });
    }

    async getById(id: string) {
        return prismaClient.integration.findUnique({
            where: { id },
        });
    }
}
