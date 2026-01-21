import { z } from "zod";

export const enableIntegrationSchema = z.object({
    integrationId: z.string().uuid("Invalid integration ID"),
});

export const integrationIdParamSchema = z.object({
    integrationId: z.string().uuid("Invalid integration ID"),
});
