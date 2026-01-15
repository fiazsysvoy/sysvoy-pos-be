import { Request, Response } from "express";
import { OrderService } from "./order.service.js";
import {
  createOrderSchema,
  returnOrderSchema,
  orderIdParamSchema,
  getOrdersQuerySchema,
  updateOrderSchema,
} from "./order.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const orderService = new OrderService();

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: parsed.error.issues.map((i) => i.message) });
  }

  const order = await orderService.create(req.user!, parsed.data);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: order,
  });
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsedParams = orderIdParamSchema.safeParse(req.params);
  const parsedBody = updateOrderSchema.partial().safeParse(req.body);

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

  const order = await orderService.update(
    req.user!,
    parsedParams.data.id,
    parsedBody.data,
  );

  res.json({
    success: true,
    message: "Order updated successfully",
    data: order,
  });
});

export const updateOrderItems = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedParams = orderIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
      return res
        .status(400)
        .json({ errors: parsedParams.error.issues.map((i) => i.message) });
    }

    const { items } = req.body as { items?: Array<{ productId: string; quantity: number }> };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        errors: ["Order must contain at least one item"],
      });
    }

    const updatedOrder = await orderService.updateItems(
      req.user!,
      parsedParams.data.id,
      { items },
    );

    res.json({
      success: true,
      message: "Order items updated successfully",
      data: updatedOrder,
    });
  },
);

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = getOrdersQuerySchema.safeParse(req.query);
    const user = req.user!;

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i) => i.message) });
    }

    const result = await orderService.getAll({ ...parsed.data, user });

    res.json({
      success: true,
      data: result,
    });
  },
);

export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    const user = req.user!;

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i) => i.message) });
    }

    const order = await orderService.getById(parsed.data.id, user);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  },
);

export const returnOrderItems = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = returnOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.issues.map((i) => i.message) });
    }

    const returnRecord = await orderService.returnItems(req.user!, parsed.data);

    res.status(201).json({
      success: true,
      message: "Items returned successfully",
      data: returnRecord,
    });
  },
);
