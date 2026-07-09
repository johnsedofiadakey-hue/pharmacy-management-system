import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TransferStatus, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "../inventory/ledger";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";

const schema = z.object({
  transferId: z.string().uuid(),
  items: z.array(z.object({ transferItemId: z.string().uuid(), quantitySent: z.number().int().positive() })).min(1),
});

/**
 * Source branch dispatches: deducts the exact requested batches (not FEFO —
 * the batch was already chosen at request time) and moves the transfer to
 * IN_TRANSIT. Quantity sent can differ from quantity requested (partial
 * availability), which receiveTransfer will reconcile.
 */
export const dispatchTransfer = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { transferId, items } = parsed.data;

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: true },
  });
  if (!transfer || transfer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Transfer not found.");
  }
  if (transfer.status !== TransferStatus.APPROVED) {
    throw new HttpsError("failed-precondition", "Transfer must be approved before dispatch.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: transfer.fromBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.EDIT,
  });

  const itemsById = new Map(transfer.items.map((i) => [i.id, i]));

  await prisma.$transaction(async (tx) => {
    for (const dispatchItem of items) {
      const transferItem = itemsById.get(dispatchItem.transferItemId);
      if (!transferItem || transferItem.transferId !== transferId) {
        throw new HttpsError("not-found", `Transfer item ${dispatchItem.transferItemId} not found.`);
      }
      if (dispatchItem.quantitySent > transferItem.quantityRequested) {
        throw new HttpsError(
          "invalid-argument",
          `Quantity sent cannot exceed quantity requested for transfer item ${transferItem.id}.`
        );
      }

      await applyStockMovement(tx, {
        organisationId: caller.organisationId,
        branchId: transfer.fromBranchId,
        productId: transferItem.productId,
        batchId: transferItem.batchId,
        quantityDelta: -dispatchItem.quantitySent,
        movementType: StockMovementType.TRANSFER_OUT,
        performedByUserId: caller.id,
        referenceType: "transfer",
        referenceId: transferId,
      });

      await tx.stockTransferItem.update({
        where: { id: transferItem.id },
        data: { quantitySent: dispatchItem.quantitySent },
      });
    }

    await tx.stockTransfer.update({
      where: { id: transferId },
      data: { status: TransferStatus.IN_TRANSIT },
    });
  });

  await refreshBranchDashboard(transfer.fromBranchId);

  const updated = await prisma.stockTransfer.findUniqueOrThrow({
    where: { id: transferId },
    include: { items: true },
  });
  return { transfer: updated };
});
