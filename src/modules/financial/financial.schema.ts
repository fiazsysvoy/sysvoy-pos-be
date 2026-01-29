import { z } from "zod";

export const getFinancialStatsQuerySchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fromDate must be in YYYY-MM-DD format")
    .transform((v) => new Date(v + "T00:00:00.000Z")),

  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "toDate must be in YYYY-MM-DD format")
    .transform((v) => {
      // Set to end of day
      const date = new Date(v + "T00:00:00.000Z");
      date.setHours(23, 59, 59, 999);
      return date;
    }),

  groupBy: z.enum(["day", "week", "month", "hour"]).optional().default("day"),

  paymentMethod: z.enum(["CASH", "JAZZCASH", "EASYPAISA"]).optional(),

  orderStatus: z.enum(["COMPLETED", "CANCELLED", "IN_PROCESS"]).optional(),

  includeRefunds: z
    .string()
    .optional()
    .transform((v) => v !== "false")
    .default("true"),
}).refine(
  (data) => data.toDate >= data.fromDate,
  {
    message: "toDate must be greater than or equal to fromDate",
    path: ["toDate"],
  }
);

export const getFinancialProductsQuerySchema = z
  .object({
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fromDate must be in YYYY-MM-DD format")
      .transform((v) => new Date(v + "T00:00:00.000Z")),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "toDate must be in YYYY-MM-DD format")
      .transform((v) => {
        const date = new Date(v + "T00:00:00.000Z");
        date.setHours(23, 59, 59, 999);
        return date;
      }),
  })
  .refine((data) => data.toDate >= data.fromDate, {
    message: "toDate must be greater than or equal to fromDate",
    path: ["toDate"],
  });

