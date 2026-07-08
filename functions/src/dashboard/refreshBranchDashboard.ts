import { prisma, SaleStatus, PaymentMethod, ApprovalStatus } from "@pharmacy-os/db";
import { firestore } from "../admin";

/**
 * Recomputes a branch's live dashboard numbers and writes them to
 * `branch_live/{branchId}` in Firestore. Called as a side effect after
 * mutations that would change these numbers (createSale, closeTill,
 * reviewStockAdjustmentRequest) rather than on a timer/cron — that's what
 * makes the dashboard feel "real time" per BLUEPRINT.md Phase 4's exit
 * criteria, without needing a native Postgres change-data-capture pipeline
 * (Firebase has no built-in CDC for an external Postgres database).
 *
 * Note: "today" is computed in UTC. This happens to be correct for Ghana
 * specifically (GMT, UTC+0) — it will need a real per-organisation timezone
 * once this system serves orgs outside Ghana (SaaS phase).
 */
export async function refreshBranchDashboard(branchId: string): Promise<void> {
  const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [todaySales, cashPayments, pendingApprovalsCount, staffClockedInCount, reorderProducts] =
    await Promise.all([
      prisma.sale.findMany({
        where: { branchId, status: SaleStatus.COMPLETED, createdAt: { gte: startOfToday } },
        select: { total: true },
      }),
      prisma.salePayment.findMany({
        where: {
          paymentMethod: PaymentMethod.CASH,
          sale: { branchId, status: SaleStatus.COMPLETED, createdAt: { gte: startOfToday } },
        },
        select: { amount: true },
      }),
      prisma.stockAdjustmentRequest.count({ where: { branchId, status: ApprovalStatus.PENDING } }),
      prisma.shift.count({ where: { branchId, clockOutAt: null } }),
      // Scoped to this branch's organisation — a cross-org leak here would
      // otherwise be invisible until the SaaS phase actually has >1 org.
      prisma.product.findMany({
        where: { organisationId: branch.organisationId, reorderLevel: { not: null } },
        select: { id: true, reorderLevel: true },
      }),
    ]);

  const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const cashCollectedToday = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const stockByProduct = await prisma.branchStock.groupBy({
    by: ["productId"],
    where: { branchId, productId: { in: reorderProducts.map((p) => p.id) } },
    _sum: { quantityOnHand: true },
  });
  const stockByProductId = new Map(stockByProduct.map((s) => [s.productId, s._sum.quantityOnHand ?? 0]));
  const lowStockCount = reorderProducts.filter(
    (p) => (stockByProductId.get(p.id) ?? 0) <= (p.reorderLevel ?? 0)
  ).length;

  await firestore
    .collection("branch_live")
    .doc(branchId)
    .set({
      organisationId: branch.organisationId,
      todaySalesTotal,
      todaySalesCount: todaySales.length,
      cashCollectedToday,
      pendingApprovalsCount,
      staffClockedInCount,
      lowStockCount,
      updatedAt: new Date().toISOString(),
    });
}
