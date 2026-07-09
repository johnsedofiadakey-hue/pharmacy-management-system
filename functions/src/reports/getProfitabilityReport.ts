import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  branchId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * BLUEPRINT.md §45.2 — cost is read from the *specific batch* each SaleItem
 * drew from (Batch.costPriceAtReceipt), not Product.costPrice, since actual
 * acquisition cost varies batch to batch. Requires REPORTS:VIEW rather than
 * PRICING, since this is a margin analysis, not a price-setting action.
 */
export const getProfitabilityReport = onCall(async (request) => {
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

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        branchId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    },
    include: { product: true, batch: true },
  });

  const byProduct = new Map<
    string,
    { name: string; revenue: number; cost: number; unitsSold: number }
  >();

  for (const item of saleItems) {
    const cost = item.quantity * Number(item.batch.costPriceAtReceipt ?? 0);
    const entry = byProduct.get(item.productId) ?? {
      name: item.product.name,
      revenue: 0,
      cost: 0,
      unitsSold: 0,
    };
    entry.revenue += Number(item.lineTotal);
    entry.cost += cost;
    entry.unitsSold += item.quantity;
    byProduct.set(item.productId, entry);
  }

  const productBreakdown = [...byProduct.entries()]
    .map(([productId, v]) => ({
      productId,
      ...v,
      profit: v.revenue - v.cost,
      marginPercent: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  const totalRevenue = productBreakdown.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = productBreakdown.reduce((sum, p) => sum + p.cost, 0);

  return {
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    overallMarginPercent: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    byProduct: productBreakdown,
  };
});
