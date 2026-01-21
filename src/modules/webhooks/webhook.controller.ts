import { Request, Response, NextFunction } from "express";
import { OrderService } from "../orders/order.service.js";
import { ProductMappingService } from "../product-mapping/product-mapping.service.js";
import { WebhookOrderPayload } from "./webhook.types.js";
import { HttpError } from "../../utils/HttpError.js";

const orderService = new OrderService();
const productMappingService = new ProductMappingService();

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

            const source = payload.source || "WEBHOOK";

            // Map external product IDs to internal product IDs
            const mappedItems = await Promise.all(
                payload.items.map(async (item) => {
                    const internalProductId = await productMappingService.getInternalProductId(
                        item.externalProductId,
                        source,
                        req.organization.id
                    );

                    if (!internalProductId) {
                        throw new HttpError(
                            `No product mapping found for external product ID: ${item.externalProductId} (source: ${source})`,
                            400
                        );
                    }

                    return {
                        productId: internalProductId,
                        quantity: item.quantity,
                    };
                })
            );

            // Create order
            const order = await orderService.createFromWebhook(
                req.organization.id,
                {
                    items: mappedItems,
                    name: payload.name,
                    source,
                    externalOrderId: payload.externalOrderId,
                }
            );

            res.status(201).json({
                success: true,
                data: order,
            });
        } catch (error) {
            next(error);
        }
    }

    async handleCancellation(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.organization) {
                throw new HttpError("Organization context missing", 500);
            }

            const payload = req.body as import("./webhook.types.js").WebhookCancellationPayload;

            if (!payload.externalOrderId) {
                throw new HttpError("Invalid payload: externalOrderId required", 400);
            }

            const source = payload.source || "WEBHOOK";

            // Cancel the order
            const order = await orderService.cancelExternalOrder(
                payload.externalOrderId,
                source,
                req.organization.id
            );

            res.status(200).json({
                success: true,
                data: order,
                message: "Order cancelled successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}
