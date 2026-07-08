import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACCELERATING_THRESHOLD_PERCENT = 20;
const DECLINING_THRESHOLD_PERCENT = -20;

/**
 * NOT the full BLUEPRINT.md §47 demand forecasting (day-of-week/seasonality/
 * historical-stockout modeling) — that's a real forecasting model needing
 * far more historical data than a freshly-launched system has. This is
 * honestly just a moving-average comparison: average daily units sold in the
 * most recent 30 days vs. the 30 days before that, classified as
 * accelerating/declining/stable by percent change. It answers "is demand for
 * this product trending up or down lately," which is useful on its own and
 * doesn't pretend to be more sophisticated than it is. A real model belongs
 * here once there's a full season or two of data to train against.
 */
export const getDemandForecast = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const now = Date.now();
  const recentStart = new Date(now - WINDOW_DAYS * DAY_MS);
  const priorStart = new Date(now - 2 * WINDOW_DAYS * DAY_MS);

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { branchId, status: SaleStatus.COMPLETED, createdAt: { gte: priorStart } },
    },
    include: { product: true, sale: { select: { createdAt: true } } },
  });

  const recent = new Map<string, { name: string; units: number }>();
  const prior = new Map<string, number>();

  for (const item of saleItems) {
    if (item.sale.createdAt >= recentStart) {
      const entry = recent.get(item.productId) ?? { name: item.product.name, units: 0 };
      entry.units += item.quantity;
      recent.set(item.productId, entry);
    } else {
      prior.set(item.productId, (prior.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const forecast = [...recent.entries()].map(([productId, recentEntry]) => {
    const priorUnits = prior.get(productId) ?? 0;
    const avgDailyRecent = recentEntry.units / WINDOW_DAYS;
    const percentChange = priorUnits > 0 ? ((recentEntry.units - priorUnits) / priorUnits) * 100 : 0;
    const trend =
      percentChange >= ACCELERATING_THRESHOLD_PERCENT
        ? "ACCELERATING"
        : percentChange <= DECLINING_THRESHOLD_PERCENT
          ? "DECLINING"
          : "STABLE";

    return {
      productId,
      productName: recentEntry.name,
      unitsSoldLast30Days: recentEntry.units,
      unitsSoldPrior30Days: priorUnits,
      avgDailySales: Math.round(avgDailyRecent * 100) / 100,
      percentChange: Math.round(percentChange * 10) / 10,
      trend,
    };
  });

  forecast.sort((a, b) => b.percentChange - a.percentChange);

  return { forecast };
});
