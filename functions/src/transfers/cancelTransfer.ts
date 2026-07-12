import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TransferStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ transferId: z.string().uuid() });

/** The requesting (destination) branch cancels — only possible before dispatch. */
export const cancelTransfer = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const transfer = await prisma.stockTransfer.findUnique({ where: { id: parsed.data.transferId } });
  if (!transfer || transfer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Transfer not found.");
  }
  const cancellableStatuses: TransferStatus[] = [TransferStatus.REQUESTED, TransferStatus.APPROVED];
  if (!cancellableStatuses.includes(transfer.status)) {
    throw new HttpsError("failed-precondition", "Transfer can no longer be cancelled once dispatched.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: transfer.toBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.CANCEL,
  });

  const updated = await prisma.stockTransfer.update({
    where: { id: transfer.id },
    data: { status: TransferStatus.CANCELLED },
  });

  return { transfer: updated };
});
