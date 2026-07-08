import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, PurchaseOrderStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ purchaseOrderId: z.string().uuid() });

export const approvePurchaseOrder = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: parsed.data.purchaseOrderId } });
  if (!po || po.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Purchase order not found.");
  }
  if (po.status !== PurchaseOrderStatus.SUBMITTED) {
    throw new HttpsError("failed-precondition", "Purchase order is not awaiting approval.");
  }

  await requirePermission({
    userId: caller.id,
    branchId: po.branchId,
    resource: PermissionResource.PURCHASES,
    action: PermissionAction.APPROVE,
  });

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: PurchaseOrderStatus.APPROVED, approvedByUserId: caller.id },
  });

  return { purchaseOrder: updated };
});
