import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

export const listPurchaseOrders = onCall(async (request) => {
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
    resource: PermissionResource.PURCHASES,
    action: PermissionAction.VIEW,
  });

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { branchId },
    include: { items: { include: { product: true } }, supplier: true },
    orderBy: { createdAt: "desc" },
  });

  return { purchaseOrders };
});
