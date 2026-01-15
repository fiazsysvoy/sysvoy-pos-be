import { prismaClient } from "../../lib/prisma.js";
import { Order, User } from "../../../generated/prisma/client.js";
import { HttpError } from "../../utils/HttpError.js";
import {
  CreateOrderData,
  ReturnOrderData,
  UpdateOrderItemsData,
} from "./order.types.js";

export class OrderService {
  async create(user: User, data: CreateOrderData) {
    const { items, name } = data;

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
          400
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
          name: name || "Order",
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

    // Return the complete order with items and creator info
    return prismaClient.order.findUnique({
      where: { id: result.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(user: User, orderId: string, data: Partial<Order>) {
    const organizationId = user.organizationId;

    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    return prismaClient.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id_organizationId: { id: orderId, organizationId } },
        include: { items: true },
      });

      if (!order) {
        throw new HttpError("Order not found", 404);
      }

      if (!data.status || data.status === order.status) {
        return order;
      }

      // Enforce valid transitions
      if (order.status !== "IN_PROCESS") {
        throw new HttpError("Only IN_PROCESS orders can be updated", 400);
      }

      if (data.status === "CANCELLED") {
        // Restock items
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        return tx.order.update({
          where: { id_organizationId: { id: orderId, organizationId } },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            completedAt: null,
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      }

      if (data.status === "COMPLETED") {
        return tx.order.update({
          where: { id_organizationId: { id: orderId, organizationId } },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      }

      throw new HttpError("Invalid order status", 400);
    });
  }

  async updateItems(
    user: User,
    orderId: string,
    data: UpdateOrderItemsData,
  ) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const { items, name } = data;

    return prismaClient.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id_organizationId: { id: orderId, organizationId } },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new HttpError("Order not found", 404);
      }

      if (order.status !== "IN_PROCESS") {
        throw new HttpError("Only IN_PROCESS orders can be edited", 400);
      }

      // Map current quantities for quick lookup
      const existingItemsByProductId = new Map<
        string,
        { id: string; quantity: number }
      >();
      for (const item of order.items) {
        existingItemsByProductId.set(item.productId, {
          id: item.id,
          quantity: item.quantity,
        });
      }

      // Collect all products involved (existing and new)
      const productIds = Array.from(
        new Set([
          ...order.items.map((i) => i.productId),
          ...items.map((i) => i.productId),
        ]),
      );

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          organizationId,
        },
      });

      if (products.length !== productIds.length) {
        throw new HttpError("One or more products not found", 400);
      }

      // Validate stock availability with delta logic
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new HttpError("Product not found", 400);
        }

        const existing = existingItemsByProductId.get(item.productId);
        const existingQty = existing ? existing.quantity : 0;
        const delta = item.quantity - existingQty; // positive => need more stock, negative => release stock

        if (delta > 0 && product.stock < delta) {
          throw new HttpError(
            `Insufficient stock for product: ${product.name}`,
            400,
          );
        }
      }

      // Apply item updates and track new total
      let newTotalAmount = 0;

      // First, delete items that are no longer present
      const incomingProductIds = new Set(items.map((i) => i.productId));
      for (const existingItem of order.items) {
        if (!incomingProductIds.has(existingItem.productId)) {
          // Delete order item and restock quantity
          await tx.orderItem.delete({
            where: { id: existingItem.id },
          });

          await tx.product.update({
            where: { id: existingItem.productId },
            data: {
              stock: {
                increment: existingItem.quantity,
              },
            },
          });
        }
      }

      // Upsert incoming items and adjust stock by delta
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)!;
        const existing = existingItemsByProductId.get(item.productId);
        const existingQty = existing ? existing.quantity : 0;
        const delta = item.quantity - existingQty;

        if (existing) {
          // Update quantity
          await tx.orderItem.update({
            where: { id: existing.id },
            data: {
              quantity: item.quantity,
            },
          });
        } else {
          // Create new order item
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
              organizationId,
            },
          });
        }

        // Update product stock based on delta
        if (delta !== 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                // if delta > 0, decrement; if delta < 0, increment
                [delta > 0 ? "decrement" : "increment"]: Math.abs(delta),
              },
            },
          });
        }

        newTotalAmount += product.price * item.quantity;
      }

      // Update order total amount
      const updatedOrder = await tx.order.update({
        where: { id_organizationId: { id: orderId, organizationId } },
        data: {
          // if name is not provided dont pass it to update
          name: name || undefined,
          totalAmount: newTotalAmount,
        },
        include: {
          items: {
            include: { product: true },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedOrder;
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
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
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
        (item) => item.id === returnItem.orderItemId
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
        0
      );
      const availableToReturn = orderItem.quantity - totalReturned;

      if (returnItem.quantity > availableToReturn) {
        if (availableToReturn === 0) {
          throw new HttpError(
            `Cannot return ${returnItem.quantity} items. Order item: ${orderItem.product.name} has already been returned`
          );
        }
        throw new HttpError(
          `Cannot return ${returnItem.quantity} items. Only ${availableToReturn} could be returned`
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
