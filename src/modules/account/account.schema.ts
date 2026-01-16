import { z } from "zod";

export const updateAccountSchema = z.object({
    name: z.string("Name is required").min(2, "Name must be at least 2 characters"),
});
