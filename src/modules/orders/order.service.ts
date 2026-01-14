import { prismaClient } from "../../lib/prisma.js";
import { User } from "../../../generated/prisma/client.js";
import { HttpError } from "../../utils/HttpError.js";
import { CreateOrderData, ReturnOrderData } from "./order.types.js";

export class OrderService {
  async create(user: User, data: CreateOrderData) {
    const { items } = data;

    // Validate products and calculate total
    const productIds = items.map((item) => item.productId);
    const products = await prismaClient.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new HttpError("One or more products not found");
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        throw new HttpError(
          `Insufficient stock for product: ${product?.name || item.productId}`,
          400,
        );
      }
    }

    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
    }> = [];

    // Calculate total and prepare order items
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        });
      }
    }

    // Create order with items in a transaction
    const result = await prismaClient.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          totalAmount,
          createdBy: {
            connect: { id: user.id },
          },
          organization: {
            connect: { id: user.organizationId! },
          },
        },
      });

      // Create order items and update stock
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            organizationId: user.organizationId!,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return order;
    });

    // Return the complete order with items
    return prismaClient.order.findUnique({
      where: { id: result.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getAll({
    pageIndex,
    pageSize,
    user,
  }: {
    pageIndex: number;
    pageSize: number;
    user: User;
  }) {
    const skip = pageIndex * pageSize;

    const [orders, total] = await Promise.all([
      prismaClient.order.findMany({
        where: { organizationId: user.organizationId! },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prismaClient.order.count({
        where: { organizationId: user.organizationId! },
      }),
    ]);

    return {
      meta: {
        total,
        pageIndex,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
      data: orders,
    };
  }

  async getById(id: string, user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error("User does not belong to any organization");
    }
    const order = await prismaClient.order.findUnique({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!order) {
      throw new HttpError("Order not found", 404);
    }
    return order;
  }

  async returnItems(user: User, data: ReturnOrderData) {
    const { orderId, items } = data;

    // Get the order with items
    const order = await prismaClient.order.findUnique({
      where: { id: orderId, organizationId: user.organizationId! },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new HttpError("Order not found");
    }

    // Validate return items
    let refundedAmount = 0;
    const returnItems: Array<{
      orderItemId: string;
      quantity: number;
    }> = [];

    for (const returnItem of items) {
      const orderItem = order.items.find(
        (item) => item.id === returnItem.orderItemId,
      );
      if (!orderItem) {
        throw new HttpError(`Order item ${returnItem.orderItemId} not found`);
      }

      // Check if return quantity exceeds ordered quantity
      const existingReturns = await prismaClient.returnItem.findMany({
        where: { orderItemId: returnItem.orderItemId },
      });

      const totalReturned = existingReturns.reduce(
        (sum, ret) => sum + ret.quantity,
        0,
      );
      const availableToReturn = orderItem.quantity - totalReturned;

      if (returnItem.quantity > availableToReturn) {
        if (availableToReturn === 0) {
          throw new HttpError(
            `Cannot return ${returnItem.quantity} items. Order item: ${orderItem.product.name} has already been returned`,
          );
        }
        throw new HttpError(
          `Cannot return ${returnItem.quantity} items. Only ${availableToReturn} could be returned`,
        );
      }

      refundedAmount += orderItem.price * returnItem.quantity;
      returnItems.push({
        orderItemId: returnItem.orderItemId,
        quantity: returnItem.quantity,
      });
    }

    // Create return with items in a transaction
    const result = await prismaClient.$transaction(async (tx) => {
      // Create return
      const returnRecord = await tx.return.create({
        data: {
          orderId,
          refundedAmount,
          createdById: user.id,
          organizationId: user.organizationId!,
        },
      });

      // Create return items and update stock
      for (const item of returnItems) {
        const orderItem = order.items.find((oi) => oi.id === item.orderItemId);

        await tx.returnItem.create({
          data: {
            organizationId: user.organizationId!,
            returnId: returnRecord.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          },
        });

        // Update product stock (add back returned items)
        if (orderItem) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      return returnRecord;
    });

    // Return the complete return record with items
    return prismaClient.return.findUnique({
      where: { id: result.id, organizationId: user.organizationId! },
      include: {
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        order: true,
      },
    });
  }
}
