import { prismaClient } from "../../lib/prisma.js";

export class TeamIntegrationService {
    async enable(organizationId: string, integrationId: string) {
        return prismaClient.integrationTeam.create({
            data: {
                organizationId,
                integrationId,
            },
            include: {
                integration: true,
            },
        });
    }

    async disable(organizationId: string, integrationId: string) {
        const record = await prismaClient.integrationTeam.findUnique({
            where: {
                integrationId_organizationId: {
                    integrationId,
                    organizationId
                }
            }
        });

        if (!record) {
            throw new Error("Integration not active for this team");
        }

        return prismaClient.integrationTeam.delete({
            where: {
                id: record.id,
            },
        });
    }

    async getActiveIntegrations(organizationId: string) {
        const teamIntegrations = await prismaClient.integrationTeam.findMany({
            where: { organizationId },
            include: {
                integration: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return teamIntegrations.map((ti) => ({
            ...ti.integration,
            enabledAt: ti.createdAt,
        }));
    }
}
