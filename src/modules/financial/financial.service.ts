import { prismaClient } from "../../lib/prisma.js";
import { User } from "../../../generated/prisma/client.js";
import { HttpError } from "../../utils/HttpError.js";
import { z } from "zod";
import {
  getFinancialStatsQuerySchema,
  getFinancialProductsQuerySchema,
} from "./financial.schema.js";

type GetFinancialStatsQuery = z.infer<typeof getFinancialStatsQuerySchema>;
type GetFinancialProductsQuery = z.infer<
  typeof getFinancialProductsQuerySchema
>;

export class FinancialService {
  async getFinancialStats(user: User, query: GetFinancialStatsQuery) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const {
      fromDate,
      toDate,
      groupBy,
      paymentMethod,
      orderStatus,
      includeRefunds,
    } = query;

    // Build base where clause
    const baseWhere: any = {
      organizationId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Add optional filters
    if (paymentMethod) {
      baseWhere.paymentMethod = paymentMethod;
    }

    if (orderStatus) {
      baseWhere.status = orderStatus;
    }

    // Get all orders in date range
    const orders = await prismaClient.order.findMany({
      where: baseWhere,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        returns: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate summary statistics
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");
    const inProcessOrders = orders.filter((o) => o.status === "IN_PROCESS");
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const cancelledRevenue = cancelledOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const inProcessRevenue = inProcessOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );

    // Calculate refunds
    let totalRefunds = 0;
    let refundsCount = 0;
    if (includeRefunds) {
      const returns = await prismaClient.return.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });
      totalRefunds = returns.reduce((sum, r) => sum + r.refundedAmount, 0);
      refundsCount = returns.length;
    }

    const netRevenue = totalRevenue - totalRefunds;
    const totalOrders = orders.length;
    const averageOrderValue =
      totalOrders > 0 ? totalRevenue / completedOrders.length : 0;

    // Payment method breakdown
    const paymentMethodBreakdown = {
      CASH: { revenue: 0, orders: 0, percentage: 0 },
      JAZZCASH: { revenue: 0, orders: 0, percentage: 0 },
      EASYPAISA: { revenue: 0, orders: 0, percentage: 0 },
    };

    completedOrders.forEach((order) => {
      const method = order.paymentMethod || "CASH";
      if (
        paymentMethodBreakdown[method as keyof typeof paymentMethodBreakdown]
      ) {
        paymentMethodBreakdown[
          method as keyof typeof paymentMethodBreakdown
        ].revenue += order.totalAmount;
        paymentMethodBreakdown[
          method as keyof typeof paymentMethodBreakdown
        ].orders += 1;
      }
    });

    // Calculate percentages
    Object.keys(paymentMethodBreakdown).forEach((method) => {
      const key = method as keyof typeof paymentMethodBreakdown;
      paymentMethodBreakdown[key].percentage =
        totalRevenue > 0
          ? (paymentMethodBreakdown[key].revenue / totalRevenue) * 100
          : 0;
    });

    // Status breakdown for donut chart (similar to the image)
    const statusBreakdown = {
      COMPLETED: {
        revenue: totalRevenue,
        orders: completedOrders.length,
        percentage:
          totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0,
      },
      CANCELLED: {
        revenue: cancelledRevenue,
        orders: cancelledOrders.length,
        percentage:
          totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0,
      },
      IN_PROCESS: {
        revenue: inProcessRevenue,
        orders: inProcessOrders.length,
        percentage:
          totalOrders > 0 ? (inProcessOrders.length / totalOrders) * 100 : 0,
      },
    };

    // Generate time series data based on groupBy
    const timeSeriesData = this.generateTimeSeriesData(
      orders,
      fromDate,
      toDate,
      groupBy,
    );

    // Get all unique product IDs from completed orders to fetch costs
    const allProductIds = new Set<string>();
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        allProductIds.add(item.productId);
      });
    });

    // Fetch product costs from database
    const productsWithCosts = await prismaClient.product.findMany({
      where: {
        id: { in: Array.from(allProductIds) },
        organizationId,
      },
      select: {
        id: true,
        cost: true,
      },
    });

    // Create a map for quick cost lookup
    const productCostMap = new Map<string, number>();
    productsWithCosts.forEach((product) => {
      productCostMap.set(product.id, product.cost || 0);
    });

    // Calculate total costs for all completed orders
    let totalCosts = 0;
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productCost = productCostMap.get(item.productId) || 0;
        totalCosts += productCost * item.quantity;
      });
    });

    // Get top products by revenue with cost data for profit calculation
    const productRevenueMap = new Map<
      string,
      {
        name: string;
        revenue: number;
        quantity: number;
        category: string;
        cost: number; // Store cost for profit calculation
      }
    >();

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId;
        const productName = item.product.name;
        const category = item.product.category.name;
        const itemRevenue = item.price * item.quantity;
        const productCost = productCostMap.get(productId) || 0;

        const existing = productRevenueMap.get(productId) || {
          name: productName,
          revenue: 0,
          quantity: 0,
          category,
          cost: productCost,
        };

        productRevenueMap.set(productId, {
          name: productName,
          revenue: existing.revenue + itemRevenue,
          quantity: existing.quantity + item.quantity,
          category,
          cost: productCost, // Use the fetched cost
        });
      });
    });

    const topProducts = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((product, index) => {
        // Calculate profit: revenue - (cost × quantity)
        const totalCost = product.cost * product.quantity;
        const profit = product.revenue - totalCost;
        // Calculate profit margin: (profit / revenue) × 100
        const profitMargin =
          product.revenue > 0 ? (profit / product.revenue) * 100 : 0;

        return {
          sNo: String(index + 1).padStart(2, "0"),
          productId: Array.from(productRevenueMap.keys())[
            Array.from(productRevenueMap.values()).indexOf(product)
          ],
          productName: product.name,
          category: product.category,
          revenue: product.revenue,
          quantity: product.quantity,
          profit: profit,
          profitMargin: profitMargin,
        };
      });

    // Calculate previous period comparison (same length period before selected range)
    const dateRange = toDate.getTime() - fromDate.getTime();
    const previousFromDate = new Date(fromDate.getTime() - dateRange - 1);
    const previousToDate = new Date(fromDate.getTime() - 1);

    const previousPeriodOrders = await prismaClient.order.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        createdAt: {
          gte: previousFromDate,
          lte: previousToDate,
        },
      },
    });

    const previousPeriodRevenue = previousPeriodOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );

    const previousPeriodOrdersCount = previousPeriodOrders.length;

    const revenueGrowthPercentage =
      previousPeriodRevenue > 0
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : previousPeriodRevenue === 0 && totalRevenue > 0
          ? 100
          : 0;

    const ordersGrowthPercentage =
      previousPeriodOrdersCount > 0
        ? ((completedOrders.length - previousPeriodOrdersCount) / previousPeriodOrdersCount) * 100
        : previousPeriodOrdersCount === 0 && completedOrders.length > 0
          ? 100
          : 0;

    // Calculate same week last month comparison
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const sameWeekLastMonthFrom = new Date(fromDateObj);
    sameWeekLastMonthFrom.setMonth(fromDateObj.getMonth() - 1);
    const sameWeekLastMonthTo = new Date(toDateObj);
    sameWeekLastMonthTo.setMonth(toDateObj.getMonth() - 1);

    const sameWeekLastMonthOrders = await prismaClient.order.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        createdAt: {
          gte: sameWeekLastMonthFrom,
          lte: sameWeekLastMonthTo,
        },
      },
    });

    const sameWeekLastMonthRevenue = sameWeekLastMonthOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );

    const sameWeekLastMonthOrdersCount = sameWeekLastMonthOrders.length;

    const revenueVsLastMonthPercentage =
      sameWeekLastMonthRevenue > 0
        ? ((totalRevenue - sameWeekLastMonthRevenue) / sameWeekLastMonthRevenue) * 100
        : sameWeekLastMonthRevenue === 0 && totalRevenue > 0
          ? 100
          : 0;

    const ordersVsLastMonthPercentage =
      sameWeekLastMonthOrdersCount > 0
        ? ((completedOrders.length - sameWeekLastMonthOrdersCount) / sameWeekLastMonthOrdersCount) * 100
        : sameWeekLastMonthOrdersCount === 0 && completedOrders.length > 0
          ? 100
          : 0;

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalCosts,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        inProcessOrders: inProcessOrders.length,
        averageOrderValue,
        netRevenue,
        refundsAmount: totalRefunds,
        refundsCount,
        cancelledRevenue,
        inProcessRevenue,
      },
      statusBreakdown,
      paymentMethodBreakdown,
      timeSeriesData,
      topProducts,
      comparison: {
        previousPeriodRevenue,
        previousPeriodOrders: previousPeriodOrdersCount,
        revenueGrowthPercentage,
        ordersGrowthPercentage,
        sameWeekLastMonthRevenue,
        sameWeekLastMonthOrders: sameWeekLastMonthOrdersCount,
        revenueVsLastMonthPercentage,
        ordersVsLastMonthPercentage,
      },
    };
  }

  async getAllProductsReport(user: User, query: GetFinancialProductsQuery) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new HttpError("User does not belong to any organization", 400);
    }

    const { fromDate, toDate } = query;

    const completedOrders = await prismaClient.order.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const allProductIds = new Set<string>();
    completedOrders.forEach((o) => {
      o.items.forEach((item) => allProductIds.add(item.productId));
    });

    const productsWithCosts = await prismaClient.product.findMany({
      where: {
        id: { in: Array.from(allProductIds) },
        organizationId,
      },
      select: { id: true, cost: true },
    });
    const productCostMap = new Map<string, number>();
    productsWithCosts.forEach((p) => productCostMap.set(p.id, p.cost ?? 0));

    const productRevenueMap = new Map<
      string,
      {
        name: string;
        revenue: number;
        quantity: number;
        category: string;
        cost: number;
      }
    >();

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId;
        const productName = item.product.name;
        const category = item.product.category.name;
        const itemRevenue = item.price * item.quantity;
        const productCost = productCostMap.get(productId) ?? 0;
        const existing = productRevenueMap.get(productId) ?? {
          name: productName,
          revenue: 0,
          quantity: 0,
          category,
          cost: productCost,
        };
        productRevenueMap.set(productId, {
          name: existing.name,
          revenue: existing.revenue + itemRevenue,
          quantity: existing.quantity + item.quantity,
          category: existing.category,
          cost: productCost,
        });
      });
    });

    const products = Array.from(productRevenueMap.entries())
      .map(([productId, p]) => {
        const totalCost = p.cost * p.quantity;
        const profit = p.revenue - totalCost;
        const profitMargin =
          p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
        return {
          productId,
          productName: p.name,
          category: p.category,
          revenue: p.revenue,
          quantity: p.quantity,
          profit,
          profitMargin,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .map((p, index) => ({
        ...p,
        sNo: String(index + 1).padStart(2, "0"),
      }));

    return products;
  }

  private generateTimeSeriesData(
    orders: any[],
    fromDate: Date,
    toDate: Date,
    groupBy: "day" | "week" | "month" | "hour",
  ) {
    const dataMap = new Map<
      string,
      {
        revenue: number;
        orders: number;
        refunds: number;
        completedRevenue: number;
        cancelledRevenue: number;
        inProcessRevenue: number;
      }
    >();

    // Group orders by time period
    orders.forEach((order) => {
      let key: string;
      const orderDate = new Date(order.createdAt);

      switch (groupBy) {
        case "hour":
          const month = String(orderDate.getMonth() + 1).padStart(2, "0");
          const day = String(orderDate.getDate()).padStart(2, "0");
          const hour = String(orderDate.getHours()).padStart(2, "0");
          key = `${orderDate.getFullYear()}-${month}-${day} ${hour}:00`;
          break;
        case "day":
          key = orderDate.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay() + 1); // Monday
          key = `W${Math.ceil(weekStart.getDate() / 7)} ${weekStart.toISOString().split("T")[0]}`;
          break;
        case "month":
          const monthNum = String(orderDate.getMonth() + 1).padStart(2, "0");
          key = `${orderDate.getFullYear()}-${monthNum}`;
          break;
        default:
          key = orderDate.toISOString().split("T")[0];
      }

      const existing = dataMap.get(key) || {
        revenue: 0,
        orders: 0,
        refunds: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        inProcessRevenue: 0,
      };

      if (order.status === "COMPLETED") {
        existing.revenue += order.totalAmount;
        existing.completedRevenue += order.totalAmount;
        existing.orders += 1;
      } else if (order.status === "CANCELLED") {
        existing.cancelledRevenue += order.totalAmount;
      } else if (order.status === "IN_PROCESS") {
        existing.inProcessRevenue += order.totalAmount;
      }

      // Add refunds
      if (order.returns && order.returns.length > 0) {
        existing.refunds += order.returns.reduce(
          (sum: number, r: any) => sum + r.refundedAmount,
          0,
        );
      }

      dataMap.set(key, existing);
    });

    // Fill in missing periods
    const result: Array<{
      date: string;
      revenue: number;
      orders: number;
      refunds: number;
      completedRevenue: number;
      cancelledRevenue: number;
      inProcessRevenue: number;
    }> = [];
    const current = new Date(fromDate);
    const end = new Date(toDate);

    while (current <= end) {
      let key: string;

      switch (groupBy) {
        case "hour":
          const month = String(current.getMonth() + 1).padStart(2, "0");
          const day = String(current.getDate()).padStart(2, "0");
          const hour = String(current.getHours()).padStart(2, "0");
          key = `${current.getFullYear()}-${month}-${day} ${hour}:00`;
          current.setHours(current.getHours() + 1);
          break;
        case "day":
          key = current.toISOString().split("T")[0];
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - current.getDay() + 1);
          key = `W${Math.ceil(weekStart.getDate() / 7)} ${weekStart.toISOString().split("T")[0]}`;
          current.setDate(current.getDate() + 7);
          break;
        case "month":
          const monthNum = String(current.getMonth() + 1).padStart(2, "0");
          key = `${current.getFullYear()}-${monthNum}`;
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          key = current.toISOString().split("T")[0];
          current.setDate(current.getDate() + 1);
      }

      const data = dataMap.get(key) || {
        revenue: 0,
        orders: 0,
        refunds: 0,
        completedRevenue: 0,
        cancelledRevenue: 0,
        inProcessRevenue: 0,
      };
      result.push({
        date: key,
        revenue: data.revenue,
        orders: data.orders,
        refunds: data.refunds,
        completedRevenue: data.completedRevenue,
        cancelledRevenue: data.cancelledRevenue,
        inProcessRevenue: data.inProcessRevenue,
      });
    }

    return result;
  }
}
