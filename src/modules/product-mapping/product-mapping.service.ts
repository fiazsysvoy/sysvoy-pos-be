import { prismaClient } from "../../lib/prisma.js";
import { HttpError } from "../../utils/HttpError.js";

export class ProductMappingService {
    /**
     * Get internal product ID from external product ID
     */
    async getInternalProductId(
        externalProductId: string,
        source: string,
        organizationId: string
    ): Promise<string | null> {
        const mapping = await prismaClient.productMapping.findUnique({
            where: {
                externalProductId_source_organizationId: {
                    externalProductId,
                    source,
                    organizationId,
                },
            },
        });

        return mapping?.productId || null;
    }

    /**
     * Create a new product mapping
     */
    async createMapping(
        externalProductId: string,
        source: string,
        productId: string,
        organizationId: string
    ) {
        // Verify product exists
        const product = await prismaClient.product.findUnique({
            where: { id: productId, organizationId },
        });

        if (!product) {
            throw new HttpError("Product not found", 404);
        }

        return prismaClient.productMapping.create({
            data: {
                externalProductId,
                source,
                productId,
                organizationId,
            },
            include: {
                product: true,
            },
        });
    }

    /**
     * Get all mappings for an organization
     */
    async getAllMappings(organizationId: string, source?: string) {
        return prismaClient.productMapping.findMany({
            where: {
                organizationId,
                ...(source && { source }),
            },
            include: {
                product: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    /**
     * Delete a mapping
     */
    async deleteMapping(id: string, organizationId: string) {
        const mapping = await prismaClient.productMapping.findFirst({
            where: { id, organizationId },
        });

        if (!mapping) {
            throw new HttpError("Mapping not found", 404);
        }

        return prismaClient.productMapping.delete({
            where: { id },
        });
    }

    /**
     * Update a mapping
     */
    async updateMapping(
        id: string,
        productId: string,
        organizationId: string
    ) {
        const mapping = await prismaClient.productMapping.findFirst({
            where: { id, organizationId },
        });

        if (!mapping) {
            throw new HttpError("Mapping not found", 404);
        }

        // Verify new product exists
        const product = await prismaClient.product.findUnique({
            where: { id: productId, organizationId },
        });

        if (!product) {
            throw new HttpError("Product not found", 404);
        }

        return prismaClient.productMapping.update({
            where: { id },
            data: { productId },
            include: {
                product: true,
            },
        });
    }
}
