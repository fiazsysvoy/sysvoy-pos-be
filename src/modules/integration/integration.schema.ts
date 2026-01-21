import { z } from "zod";

export const createIntegrationSchema = z.object({
    name: z.string("Name is required").min(1, "Name is required"),
    image: z.string().optional(),
});

export const updateIntegrationSchema = createIntegrationSchema.partial();

export const integrationIdParamSchema = z.object({
    id: z.string().uuid("Invalid integration ID"),
});
