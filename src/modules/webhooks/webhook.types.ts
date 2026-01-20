export interface WebhookOrderPayload {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    source?: string;
    name?: string; // customer name
}
