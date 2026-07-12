import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, ApprovalStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const listSchema = z.object({ branchId: z.string().uuid() });

export const listPendingStockAdjustmentRequests = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = listSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.APPROVE,
  });

  const requests = await prisma.stockAdjustmentRequest.findMany({
    where: { branchId, status: ApprovalStatus.PENDING },
    include: { batch: { include: { product: true } }, requestedBy: true },
    orderBy: { createdAt: "asc" },
  });

  return { requests };
});
