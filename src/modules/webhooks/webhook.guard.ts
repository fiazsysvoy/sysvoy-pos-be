import { Request, Response, NextFunction } from "express";
import { prismaClient } from "../../lib/prisma.js";
import { HttpError } from "../../utils/HttpError.js";

declare global {
    namespace Express {
        interface Request {
            organization?: any;
        }
    }
}

export const requireWebhookSecret = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const secret = req.headers["x-webhook-secret"] as string;

        if (!secret) {
            throw new HttpError("Missing webhook secret", 401);
        }

        // Find organization by webhook secret
        const organization = await prismaClient.organization.findFirst({
            where: {
                clientSecret: secret,
            },
        });

        if (!organization) {
            throw new HttpError("Invalid webhook secret", 401);
        }

        req.organization = organization;
        next();
    } catch (error) {
        next(error);
    }
};
