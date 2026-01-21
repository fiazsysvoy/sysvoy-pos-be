export interface WebhookOrderPayload {
    items: Array<{
        externalProductId: string; // External system's product ID
        quantity: number;
    }>;
    source?: string;
    name?: string; // customer name
    externalOrderId?: string; // External system's order ID
}

export interface WebhookCancellationPayload {
    externalOrderId: string; // External system's order ID
    source?: string;
}
