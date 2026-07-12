import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  branchId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/** BLUEPRINT.md §45.1 — daily/product/category/staff/payment-method sales breakdown. */
export const getSalesReport = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, startDate, endDate } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payments: true,
      cashier: true,
    },
  });

  const dailyTotals = new Map<string, { total: number; count: number }>();
  const byProduct = new Map<string, { name: string; revenue: number; unitsSold: number }>();
  const byCategory = new Map<string, { revenue: number }>();
  const byStaff = new Map<string, { name: string; revenue: number; transactions: number }>();
  const byPaymentMethod = new Map<string, number>();

  for (const sale of sales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    const dayEntry = dailyTotals.get(day) ?? { total: 0, count: 0 };
    dayEntry.total += Number(sale.total);
    dayEntry.count += 1;
    dailyTotals.set(day, dayEntry);

    const staffEntry = byStaff.get(sale.cashierUserId) ?? {
      name: sale.cashier.name,
      revenue: 0,
      transactions: 0,
    };
    staffEntry.revenue += Number(sale.total);
    staffEntry.transactions += 1;
    byStaff.set(sale.cashierUserId, staffEntry);

    for (const item of sale.items) {
      const productEntry = byProduct.get(item.productId) ?? {
        name: item.product.name,
        revenue: 0,
        unitsSold: 0,
      };
      productEntry.revenue += Number(item.lineTotal);
      productEntry.unitsSold += item.quantity;
      byProduct.set(item.productId, productEntry);

      const categoryName = item.product.category?.name ?? "Uncategorised";
      const categoryEntry = byCategory.get(categoryName) ?? { revenue: 0 };
      categoryEntry.revenue += Number(item.lineTotal);
      byCategory.set(categoryName, categoryEntry);
    }

    for (const payment of sale.payments) {
      byPaymentMethod.set(
        payment.paymentMethod,
        (byPaymentMethod.get(payment.paymentMethod) ?? 0) + Number(payment.amount)
      );
    }
  }

  return {
    totalRevenue: sales.reduce((sum, s) => sum + Number(s.total), 0),
    totalTransactions: sales.length,
    dailySales: [...dailyTotals.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    byProduct: [...byProduct.entries()].map(([productId, v]) => ({ productId, ...v })).sort((a, b) => b.revenue - a.revenue),
    byCategory: [...byCategory.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.revenue - a.revenue),
    byStaff: [...byStaff.entries()].map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.revenue - a.revenue),
    byPaymentMethod: [...byPaymentMethod.entries()].map(([method, amount]) => ({ method, amount })),
  };
});
