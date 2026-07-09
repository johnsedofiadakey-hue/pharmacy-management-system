import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

const DEAD_STOCK_WINDOW_DAYS = 90;
const VELOCITY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** BLUEPRINT.md §45.3 — valuation, low/dead stock, fast/slow movers, expiry buckets. */
export const getInventoryReport = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const now = Date.now();
  const deadStockCutoff = new Date(now - DEAD_STOCK_WINDOW_DAYS * DAY_MS);
  const velocityCutoff = new Date(now - VELOCITY_WINDOW_DAYS * DAY_MS);

  const [stock, recentSaleItems] = await Promise.all([
    prisma.branchStock.findMany({
      where: { branchId, quantityOnHand: { gt: 0 } },
      include: { batch: { include: { product: true } } },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: { branchId, status: SaleStatus.COMPLETED, createdAt: { gte: deadStockCutoff } },
      },
      select: { productId: true, quantity: true, sale: { select: { createdAt: true } } },
    }),
  ]);

  const unitsSoldSince = (cutoff: Date) => {
    const map = new Map<string, number>();
    for (const item of recentSaleItems) {
      if (item.sale.createdAt < cutoff) continue;
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  };
  const unitsSoldLast90 = unitsSoldSince(deadStockCutoff);
  const unitsSoldLast30 = unitsSoldSince(velocityCutoff);

  const byProduct = new Map<
    string,
    { name: string; quantityOnHand: number; value: number; reorderLevel: number | null }
  >();
  const expiryRisk = { expired: 0, within30Days: 0, within90Days: 0, within180Days: 0 };

  for (const s of stock) {
    const entry = byProduct.get(s.productId) ?? {
      name: s.batch.product.name,
      quantityOnHand: 0,
      value: 0,
      reorderLevel: s.batch.product.reorderLevel,
    };
    entry.quantityOnHand += s.quantityOnHand;
    entry.value += s.quantityOnHand * Number(s.batch.costPriceAtReceipt ?? 0);
    byProduct.set(s.productId, entry);

    if (s.batch.expiryDate) {
      const value = s.quantityOnHand * Number(s.batch.costPriceAtReceipt ?? 0);
      const daysToExpiry = (s.batch.expiryDate.getTime() - now) / DAY_MS;
      if (daysToExpiry < 0) expiryRisk.expired += value;
      else if (daysToExpiry <= 30) expiryRisk.within30Days += value;
      else if (daysToExpiry <= 90) expiryRisk.within90Days += value;
      else if (daysToExpiry <= 180) expiryRisk.within180Days += value;
    }
  }

  const products = [...byProduct.entries()].map(([productId, v]) => ({ productId, ...v }));

  const lowStock = products.filter(
    (p) => p.reorderLevel !== null && p.quantityOnHand <= p.reorderLevel
  );
  const deadStock = products.filter((p) => !unitsSoldLast90.has(p.productId));
  const movers = products
    .map((p) => ({ ...p, unitsSoldLast30Days: unitsSoldLast30.get(p.productId) ?? 0 }))
    .sort((a, b) => b.unitsSoldLast30Days - a.unitsSoldLast30Days);

  return {
    totalStockValue: products.reduce((sum, p) => sum + p.value, 0),
    lowStock,
    deadStock,
    fastMoving: movers.slice(0, 10),
    slowMoving: movers.slice(-10).reverse(),
    expiryRisk,
  };
});
