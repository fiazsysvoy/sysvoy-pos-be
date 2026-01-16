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

  async getRevenueStats(user: User) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    // Get start of today, this week, and this month
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6 days back
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate revenue for each period (only COMPLETED orders)
    const [todayRevenue, weekRevenue, monthRevenue, todayOrders, weekOrders, monthOrders] = await Promise.all([
      // Today's revenue
      prismaClient.order.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfToday,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // This week's revenue
      prismaClient.order.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfWeek,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // This month's revenue
      prismaClient.order.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // Today's hourly revenue (last 24 hours)
      prismaClient.order.findMany({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfToday,
          },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // This week's daily revenue (for week chart)
      prismaClient.order.findMany({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfWeek,
          },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // This month's daily revenue (for month chart)
      prismaClient.order.findMany({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: {
            gte: startOfMonth,
          },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    // Process today's hourly data (group by hour)
    const hourlyRevenueMap = new Map<string, number>();
    todayOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const hourKey = `${date.getHours()}:00`;
      hourlyRevenueMap.set(
        hourKey,
        (hourlyRevenueMap.get(hourKey) || 0) + order.totalAmount
      );
    });

    // Generate hourly data for today (last 12 hours, or all hours today if less than 12)
    const todayHourlyData: Array<{ time: string; revenue: number }> = [];
    const currentHour = now.getHours();
    const hoursSinceMidnight = currentHour + 1;
    const hoursToShow = Math.min(12, hoursSinceMidnight);
    const startHour = Math.max(0, currentHour - hoursToShow + 1);
    
    for (let h = startHour; h <= currentHour; h++) {
      const hourKey = `${String(h).padStart(2, '0')}:00`;
      todayHourlyData.push({
        time: hourKey,
        revenue: hourlyRevenueMap.get(`${h}:00`) || 0,
      });
    }

    // Process week's daily data
    const weekDailyMap = new Map<string, number>();
    weekOrders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      weekDailyMap.set(
        dateKey,
        (weekDailyMap.get(dateKey) || 0) + order.totalAmount
      );
    });

    // Generate daily data for this week (Monday to today, inclusive)
    const weekDailyData: Array<{ date: string; revenue: number }> = [];
    // Calculate days from Monday to today (inclusive)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
    const daysSinceMonday = Math.floor((todayDate.getTime() - mondayDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysToShow = Math.min(7, daysSinceMonday);
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0); // Normalize to start of day
      // Use local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      weekDailyData.push({
        date: dateKey,
        revenue: weekDailyMap.get(dateKey) || 0,
      });
    }

    // Process month's data - group by week
    const monthWeeklyMap = new Map<number, number>();
    monthOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      // Calculate which week of the month (1-4)
      const weekOfMonth = Math.ceil(orderDate.getDate() / 7);
      const weekKey = Math.min(weekOfMonth, 4); // Cap at 4 weeks
      monthWeeklyMap.set(
        weekKey,
        (monthWeeklyMap.get(weekKey) || 0) + order.totalAmount
      );
    });

    // Generate weekly data for this month (W1, W2, W3, W4)
    const monthDailyData: Array<{ date: string; revenue: number; week?: number }> = [];
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);
    const weeksToShow = Math.min(4, currentWeekOfMonth);
    
    for (let week = 1; week <= weeksToShow; week++) {
      monthDailyData.push({
        date: `W${week}`, // Week label
        revenue: monthWeeklyMap.get(week) || 0,
        week: week,
      });
    }

    return {
      today: todayRevenue._sum.totalAmount || 0,
      thisWeek: weekRevenue._sum.totalAmount || 0,
      thisMonth: monthRevenue._sum.totalAmount || 0,
      todayData: todayHourlyData,
      weekData: weekDailyData,
      monthData: monthDailyData,
    };
  }
}
