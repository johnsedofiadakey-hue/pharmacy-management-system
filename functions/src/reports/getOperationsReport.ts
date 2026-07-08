import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TillSessionStatus, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  branchId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * BLUEPRINT.md §45.5 — returns/discounts/adjustments/transfers/cash
 * differences. Returns/refunds aren't reported here because that feature
 * itself doesn't exist yet — Phase 3 deliberately deferred void/refund as a
 * distinct workflow (reversing specific batch deductions, choosing a
 * disposition for returned medicine) rather than building it as an
 * afterthought. Discounts are included via SaleItem.discountAmount, which
 * does exist.
 */
export const getOperationsReport = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, startDate, endDate } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const dateRange = { gte: new Date(startDate), lte: new Date(endDate) };

  const [saleItems, adjustmentMovements, transfers, tillSessions] = await Promise.all([
    prisma.saleItem.findMany({
      where: { sale: { branchId, createdAt: dateRange } },
      select: { discountAmount: true },
    }),
    prisma.stockMovement.findMany({
      where: {
        branchId,
        createdAt: dateRange,
        movementType: {
          in: [
            StockMovementType.ADJUSTMENT_DAMAGE,
            StockMovementType.ADJUSTMENT_EXPIRY,
            StockMovementType.ADJUSTMENT_LOSS,
            StockMovementType.ADJUSTMENT_THEFT,
            StockMovementType.ADJUSTMENT_COUNTING,
            StockMovementType.ADJUSTMENT_CORRECTION,
          ],
        },
      },
      select: { movementType: true, quantityDelta: true },
    }),
    prisma.stockTransfer.findMany({
      where: {
        OR: [{ fromBranchId: branchId }, { toBranchId: branchId }],
        createdAt: dateRange,
      },
      select: { status: true },
    }),
    prisma.tillSession.findMany({
      where: { branchId, status: TillSessionStatus.CLOSED, closedAt: dateRange },
      select: { variance: true },
    }),
  ]);

  const adjustmentsByType = new Map<string, number>();
  for (const m of adjustmentMovements) {
    adjustmentsByType.set(
      m.movementType,
      (adjustmentsByType.get(m.movementType) ?? 0) + Math.abs(m.quantityDelta)
    );
  }

  const transfersByStatus = new Map<string, number>();
  for (const t of transfers) {
    transfersByStatus.set(t.status, (transfersByStatus.get(t.status) ?? 0) + 1);
  }

  return {
    totalDiscounts: saleItems.reduce((sum, i) => sum + Number(i.discountAmount), 0),
    adjustmentsByType: [...adjustmentsByType.entries()].map(([type, units]) => ({ type, units })),
    transfersByStatus: [...transfersByStatus.entries()].map(([status, count]) => ({ status, count })),
    cashVariance: {
      totalSessions: tillSessions.length,
      totalVariance: tillSessions.reduce((sum, s) => sum + Number(s.variance ?? 0), 0),
      sessionsWithDiscrepancy: tillSessions.filter((s) => Number(s.variance ?? 0) !== 0).length,
    },
  };
});
