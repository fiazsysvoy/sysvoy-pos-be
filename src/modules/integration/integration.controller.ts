import { Request, Response } from "express";
import { IntegrationService } from "./integration.service.js";
import {
    createIntegrationSchema,
    updateIntegrationSchema,
    integrationIdParamSchema,
} from "./integration.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const integrationService = new IntegrationService();

export const createIntegration = asyncHandler(
    async (req: Request, res: Response) => {
        const parsed = createIntegrationSchema.safeParse(req.body);

        if (!parsed.success) {
            return res
                .status(400)
                .json({ errors: parsed.error.issues.map((i) => i.message) });
        }

        const integration = await integrationService.create(parsed.data);

        res.status(201).json({
            success: true,
            message: "Integration created successfully",
            data: integration,
        });
    }
);

export const updateIntegration = asyncHandler(
    async (req: Request, res: Response) => {
        const parsedParams = integrationIdParamSchema.safeParse(req.params);
        const parsedBody = updateIntegrationSchema.safeParse(req.body);

        if (!parsedParams.success) {
            return res
                .status(400)
                .json({ errors: parsedParams.error.issues.map((i) => i.message) });
        }

        if (!parsedBody.success) {
            return res
                .status(400)
                .json({ errors: parsedBody.error.issues.map((i) => i.message) });
        }

        const integration = await integrationService.update(
            parsedParams.data.id,
            parsedBody.data
        );

        res.json({
            success: true,
            message: "Integration updated successfully",
            data: integration,
        });
    }
);

export const deleteIntegration = asyncHandler(
    async (req: Request, res: Response) => {
        const parsedParams = integrationIdParamSchema.safeParse(req.params);

        if (!parsedParams.success) {
            return res
                .status(400)
                .json({ errors: parsedParams.error.issues.map((i) => i.message) });
        }

        await integrationService.delete(parsedParams.data.id);

        res.json({
            success: true,
            message: "Integration deleted successfully",
        });
    }
);

export const getAllIntegrations = asyncHandler(
    async (req: Request, res: Response) => {
        const integrations = await integrationService.getAll();

        res.json({
            success: true,
            data: integrations,
        });
    }
);
