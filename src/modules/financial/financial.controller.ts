import { Request, Response } from "express";
import { FinancialService } from "./financial.service.js";
import {
  getFinancialStatsQuerySchema,
  getFinancialProductsQuerySchema,
} from "./financial.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const financialService = new FinancialService();

export const getFinancialStats = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = getFinancialStatsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    const stats = await financialService.getFinancialStats(req.user!, parsed.data);

    res.json({
      success: true,
      data: stats,
    });
  }
);

export const getFinancialProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = getFinancialProductsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.issues.map((i) => i.message),
      });
    }

    const products = await financialService.getAllProductsReport(
      req.user!,
      parsed.data,
    );

    res.json({
      success: true,
      data: products,
    });
  }
);

