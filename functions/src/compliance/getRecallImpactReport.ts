import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ recallId: z.string().uuid() });

/**
 * "Identify affected customers" (BLUEPRINT.md §42) by querying existing
 * SaleItem/OrderItem rows for this batch — no separate denormalized list,
 * the sale/order records already are that list.
 */
export const getRecallImpactReport = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.STOCK,
    action: PermissionAction.VIEW,
  });

  const recall = await prisma.drugRecall.findUnique({
    where: { id: parsed.data.recallId },
    include: { batch: { include: { product: true } } },
  });
  if (!recall || recall.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Recall not found.");
  }

  const [remainingByBranch, saleItems, orderItems] = await Promise.all([
    prisma.branchStock.findMany({
      where: { batchId: recall.batchId, quantityOnHand: { gt: 0 } },
      include: { branch: true },
    }),
    prisma.saleItem.findMany({
      where: { batchId: recall.batchId },
      include: { sale: { include: { customer: true } } },
    }),
    prisma.orderItem.findMany({
      where: { batchId: recall.batchId },
      include: { order: { include: { customer: true } } },
    }),
  ]);

  const affectedCustomers = new Map<string, { phone: string; name: string | null }>();
  for (const item of saleItems) {
    if (item.sale.customer) affectedCustomers.set(item.sale.customer.id, item.sale.customer);
  }
  for (const item of orderItems) {
    affectedCustomers.set(item.order.customer.id, item.order.customer);
  }

  return {
    recall,
    remainingByBranch: remainingByBranch.map((s) => ({
      branchId: s.branchId,
      branchName: s.branch.name,
      quantityOnHand: s.quantityOnHand,
    })),
    affectedCustomers: [...affectedCustomers.values()],
  };
});
