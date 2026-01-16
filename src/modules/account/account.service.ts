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
}
