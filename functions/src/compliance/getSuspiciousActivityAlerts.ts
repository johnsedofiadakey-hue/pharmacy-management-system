import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const DISCOUNT_OUTLIER_MULTIPLIER = 2;
const ADJUSTMENT_COUNT_THRESHOLD = 10;
const CASH_VARIANCE_THRESHOLD = 50;

/**
 * BLUEPRINT.md §49 — flags outliers from data that actually exists, not the
 * blueprint's full example list. "Many voided transactions" and "repeated
 * refunds" aren't checkable: void/refund isn't a built feature (Phase 3
 * deliberately deferred it), so there's no VOIDED-status data or refund
 * records to look at. What's implemented instead: per-cashier discount rate
 * vs. branch average, stock adjustment request frequency per user, and
 * repeated large till variances — all real signals from data Phases 2-6
 * actually capture. This flags for review; it never blocks or accuses.
 */
export const getSuspiciousActivityAlerts = onCall(async (request) => {
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

  const windowStart = new Date(Date.now() - WINDOW_DAYS * DAY_MS);
  const alerts: Array<{ type: string; severity: "WARNING" | "CRITICAL"; description: string }> = [];

  const sales = await prisma.sale.findMany({
    where: { branchId, status: SaleStatus.COMPLETED, createdAt: { gte: windowStart } },
    include: { items: true, cashier: true },
  });

  const discountRateByCashier = new Map<string, { name: string; discount: number; subtotal: number }>();
  for (const sale of sales) {
    const entry = discountRateByCashier.get(sale.cashierUserId) ?? {
      name: sale.cashier.name,
      discount: 0,
      subtotal: 0,
    };
    entry.discount += Number(sale.discountTotal);
    entry.subtotal += Number(sale.subtotal);
    discountRateByCashier.set(sale.cashierUserId, entry);
  }

  const branchTotalDiscount = [...discountRateByCashier.values()].reduce((sum, c) => sum + c.discount, 0);
  const branchTotalSubtotal = [...discountRateByCashier.values()].reduce((sum, c) => sum + c.subtotal, 0);
  const branchAvgDiscountRate = branchTotalSubtotal > 0 ? branchTotalDiscount / branchTotalSubtotal : 0;

  for (const [, entry] of discountRateByCashier) {
    if (entry.subtotal === 0) continue;
    const rate = entry.discount / entry.subtotal;
    if (branchAvgDiscountRate > 0 && rate > branchAvgDiscountRate * DISCOUNT_OUTLIER_MULTIPLIER) {
      alerts.push({
        type: "HIGH_DISCOUNT_RATE",
        severity: "WARNING",
        description: `${entry.name}'s discount rate (${(rate * 100).toFixed(1)}%) is more than ${DISCOUNT_OUTLIER_MULTIPLIER}x the branch average (${(branchAvgDiscountRate * 100).toFixed(1)}%).`,
      });
    }
  }

  const adjustmentRequests = await prisma.stockAdjustmentRequest.findMany({
    where: { branchId, createdAt: { gte: windowStart } },
    include: { requestedBy: true },
  });
  const adjustmentsByUser = new Map<string, { name: string; count: number }>();
  for (const req of adjustmentRequests) {
    const entry = adjustmentsByUser.get(req.requestedByUserId) ?? { name: req.requestedBy.name, count: 0 };
    entry.count += 1;
    adjustmentsByUser.set(req.requestedByUserId, entry);
  }
  for (const [, entry] of adjustmentsByUser) {
    if (entry.count >= ADJUSTMENT_COUNT_THRESHOLD) {
      alerts.push({
        type: "FREQUENT_STOCK_ADJUSTMENTS",
        severity: "WARNING",
        description: `${entry.name} requested ${entry.count} stock adjustments in the last ${WINDOW_DAYS} days.`,
      });
    }
  }

  const tillSessions = await prisma.tillSession.findMany({
    where: { branchId, closedAt: { gte: windowStart }, variance: { not: null } },
    include: { cashier: true },
  });
  const varianceByCashier = new Map<string, { name: string; largeVariances: number }>();
  for (const session of tillSessions) {
    if (Math.abs(Number(session.variance)) < CASH_VARIANCE_THRESHOLD) continue;
    const entry = varianceByCashier.get(session.cashierUserId) ?? {
      name: session.cashier.name,
      largeVariances: 0,
    };
    entry.largeVariances += 1;
    varianceByCashier.set(session.cashierUserId, entry);
  }
  for (const [, entry] of varianceByCashier) {
    if (entry.largeVariances >= 2) {
      alerts.push({
        type: "REPEATED_CASH_DISCREPANCY",
        severity: "CRITICAL",
        description: `${entry.name} had ${entry.largeVariances} till sessions with a variance over GHS ${CASH_VARIANCE_THRESHOLD} in the last ${WINDOW_DAYS} days.`,
      });
    }
  }

  return { alerts };
});
