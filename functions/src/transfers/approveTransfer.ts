import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TransferStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ transferId: z.string().uuid() });

/** The source branch approves giving up the stock. */
export const approveTransfer = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const transfer = await prisma.stockTransfer.findUnique({ where: { id: parsed.data.transferId } });
  if (!transfer || transfer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Transfer not found.");
  }
  if (transfer.status !== TransferStatus.REQUESTED) {
    throw new HttpsError("failed-precondition", "Transfer is not awaiting approval.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: transfer.fromBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.APPROVE,
  });

  const updated = await prisma.stockTransfer.update({
    where: { id: transfer.id },
    data: { status: TransferStatus.APPROVED, approvedByUserId: caller.id },
  });

  return { transfer: updated };
});
