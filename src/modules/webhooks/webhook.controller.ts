import { Request, Response, NextFunction } from "express";
import { OrderService } from "../orders/order.service.js";
import { WebhookOrderPayload } from "./webhook.types.js";
import { HttpError } from "../../utils/HttpError.js";

const orderService = new OrderService();

export class WebhookController {
    async handleOrder(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.organization) {
                throw new HttpError("Organization context missing", 500);
            }

            const payload = req.body as WebhookOrderPayload;

            if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
                throw new HttpError("Invalid payload: items required", 400);
            }

            // Create order
            const order = await orderService.createFromWebhook(
                req.organization.id,
                { ...payload, source: payload.source || "WEBHOOK" }
            );

            res.status(201).json({
                success: true,
                data: order,
            });
        } catch (error) {
            next(error);
        }
    }
}
