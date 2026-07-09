import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction, SaleStatus, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * BLUEPRINT.md §48 — per-branch sales/margin/stock-loss/expiry-loss over a
 * fixed trailing 30-day window. Org-wide (branchId: null), same gate as
 * getCompanyDashboard — only an org-wide role (Super Admin/Head Office) can
 * compare across branches; a branch-scoped Branch Manager role doesn't
 * qualify.
 */
export const getBranchBenchmarking = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const windowStart = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const branches = await prisma.branch.findMany({ where: { organisationId: caller.organisationId } });

  const [saleItems, lossMovements] = await Promise.all([
    prisma.saleItem.findMany({
      where: { sale: { organisationId: caller.organisationId, status: SaleStatus.COMPLETED, createdAt: { gte: windowStart } } },
      include: { batch: true, sale: { select: { branchId: true, total: true, id: true } } },
    }),
    prisma.stockMovement.findMany({
      where: {
        organisationId: caller.organisationId,
        createdAt: { gte: windowStart },
        movementType: {
          in: [
            StockMovementType.ADJUSTMENT_DAMAGE,
            StockMovementType.ADJUSTMENT_LOSS,
            StockMovementType.ADJUSTMENT_THEFT,
            StockMovementType.ADJUSTMENT_EXPIRY,
          ],
        },
      },
      include: { batch: true },
    }),
  ]);

  const revenueByBranch = new Map<string, number>();
  const costByBranch = new Map<string, number>();
  const saleIdsByBranch = new Map<string, Set<string>>();

  for (const item of saleItems) {
    const branchId = item.sale.branchId;
    revenueByBranch.set(branchId, (revenueByBranch.get(branchId) ?? 0) + Number(item.lineTotal));
    costByBranch.set(
      branchId,
      (costByBranch.get(branchId) ?? 0) + item.quantity * Number(item.batch.costPriceAtReceipt ?? 0)
    );
    const set = saleIdsByBranch.get(branchId) ?? new Set<string>();
    set.add(item.sale.id);
    saleIdsByBranch.set(branchId, set);
  }

  const stockLossByBranch = new Map<string, number>();
  const expiryLossByBranch = new Map<string, number>();

  for (const m of lossMovements) {
    const value = Math.abs(m.quantityDelta) * Number(m.batch.costPriceAtReceipt ?? 0);
    if (m.movementType === StockMovementType.ADJUSTMENT_EXPIRY) {
      expiryLossByBranch.set(m.branchId, (expiryLossByBranch.get(m.branchId) ?? 0) + value);
    } else {
      stockLossByBranch.set(m.branchId, (stockLossByBranch.get(m.branchId) ?? 0) + value);
    }
  }

  const benchmarking = branches.map((branch) => {
    const revenue = revenueByBranch.get(branch.id) ?? 0;
    const cost = costByBranch.get(branch.id) ?? 0;
    return {
      branchId: branch.id,
      branchName: branch.name,
      sales: revenue,
      transactions: saleIdsByBranch.get(branch.id)?.size ?? 0,
      grossMarginPercent: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      stockLossValue: stockLossByBranch.get(branch.id) ?? 0,
      expiryLossValue: expiryLossByBranch.get(branch.id) ?? 0,
    };
  });

  return { windowDays: WINDOW_DAYS, benchmarking };
});
