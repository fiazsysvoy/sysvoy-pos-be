import { Request, Response } from "express";
import { TeamIntegrationService } from "./team-integration.service.js";
import {
    enableIntegrationSchema,
    integrationIdParamSchema,
} from "./team-integration.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const teamIntegrationService = new TeamIntegrationService();

export const enableIntegration = asyncHandler(
    async (req: Request, res: Response) => {
        const parsed = enableIntegrationSchema.safeParse(req.body);

        if (!parsed.success) {
            return res
                .status(400)
                .json({ errors: parsed.error.issues.map((i) => i.message) });
        }

        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({ message: "User is not part of an organization" });
        }

        try {
            const result = await teamIntegrationService.enable(
                organizationId,
                parsed.data.integrationId
            );

            res.status(201).json({
                success: true,
                message: "Integration enabled successfully",
                data: result,
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(409).json({ message: "Integration already enabled" });
            }
            throw error;
        }
    }
);

export const disableIntegration = asyncHandler(
    async (req: Request, res: Response) => {
        const parsedParams = integrationIdParamSchema.safeParse(req.params);

        if (!parsedParams.success) {
            return res
                .status(400)
                .json({ errors: parsedParams.error.issues.map((i) => i.message) });
        }

        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "User is not part of an organization" });
        }

        try {
            await teamIntegrationService.disable(organizationId, parsedParams.data.integrationId);

            res.json({
                success: true,
                message: "Integration disabled successfully",
            });
        } catch (error: any) {
            if (error.message === "Integration not active for this team") {
                return res.status(404).json({ message: error.message });
            }
            throw error;
        }
    }
);

export const getActiveIntegrations = asyncHandler(
    async (req: Request, res: Response) => {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "User is not part of an organization" });
        }

        const integrations = await teamIntegrationService.getActiveIntegrations(organizationId);

        res.json({
            success: true,
            data: integrations,
        });
    }
);
