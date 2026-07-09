import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction, SaleStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

/**
 * Org-wide command-centre numbers (BLUEPRINT.md §7 Super Admin dashboard).
 * Requires an org-wide REPORTS:VIEW grant (branchId: null) — a Branch Manager
 * whose role is scoped to one branch cannot call this, only Super
 * Admin/Head Office roles that hold an org-wide grant. Computed on demand
 * from Postgres rather than a Firestore projection like the branch dashboard —
 * this doesn't need the same "instant on every mutation" property, and
 * aggregating across every branch on every sale would be wasteful.
 */
export const getCompanyDashboard = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [branches, todaySales, branchSalesGrouped, stockWithExpiry] = await Promise.all([
    prisma.branch.findMany({ where: { organisationId: caller.organisationId } }),
    prisma.sale.findMany({
      where: {
        organisationId: caller.organisationId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: startOfToday },
      },
      select: { total: true },
    }),
    prisma.sale.groupBy({
      by: ["branchId"],
      where: {
        organisationId: caller.organisationId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: startOfToday },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.branchStock.findMany({
      where: { branch: { organisationId: caller.organisationId }, quantityOnHand: { gt: 0 } },
      include: { batch: true },
    }),
  ]);

  const salesByBranchId = new Map(
    branchSalesGrouped.map((g) => [g.branchId, { total: Number(g._sum.total ?? 0), count: g._count.id }])
  );

  const branchBreakdown = branches.map((branch) => ({
    branchId: branch.id,
    name: branch.name,
    salesToday: salesByBranchId.get(branch.id)?.total ?? 0,
    transactionsToday: salesByBranchId.get(branch.id)?.count ?? 0,
  }));

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const expiryRisk = { expired: 0, within30Days: 0, within90Days: 0, within180Days: 0 };

  for (const stock of stockWithExpiry) {
    if (!stock.batch.expiryDate) continue;
    const value = stock.quantityOnHand * Number(stock.batch.costPriceAtReceipt ?? 0);
    const daysToExpiry = (stock.batch.expiryDate.getTime() - now) / DAY_MS;

    if (daysToExpiry < 0) expiryRisk.expired += value;
    else if (daysToExpiry <= 30) expiryRisk.within30Days += value;
    else if (daysToExpiry <= 90) expiryRisk.within90Days += value;
    else if (daysToExpiry <= 180) expiryRisk.within180Days += value;
  }

  return {
    totalSalesToday: todaySales.reduce((sum, s) => sum + Number(s.total), 0),
    totalTransactionsToday: todaySales.length,
    activeBranchesCount: branches.filter((b) => b.isActive).length,
    branchBreakdown,
    expiryRisk,
  };
});
