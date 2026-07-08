import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TransferStatus, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "../inventory/ledger";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";

const schema = z.object({
  transferId: z.string().uuid(),
  items: z
    .array(z.object({ transferItemId: z.string().uuid(), quantityReceived: z.number().int().nonnegative() }))
    .min(1),
});

/**
 * Destination branch confirms receipt — adds quantity to branch_stock for the
 * *same* batch record the source dispatched, which is what preserves expiry
 * data across the transfer without any special-casing. Marks the transfer
 * RECEIVED if every item's received quantity matches what was sent, otherwise
 * PARTIALLY_RECEIVED.
 */
export const receiveTransfer = onCall(async (request) => {
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
  if (transfer.status !== TransferStatus.IN_TRANSIT) {
    throw new HttpsError("failed-precondition", "Transfer is not in transit.");
  }

  await requirePermission({
    userId: caller.id,
    branchId: transfer.toBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.EDIT,
  });

  const itemsById = new Map(transfer.items.map((i) => [i.id, i]));

  await prisma.$transaction(async (tx) => {
    for (const receiveItem of items) {
      const transferItem = itemsById.get(receiveItem.transferItemId);
      if (!transferItem || transferItem.transferId !== transferId || transferItem.quantitySent === null) {
        throw new HttpsError("not-found", `Dispatched transfer item ${receiveItem.transferItemId} not found.`);
      }

      if (receiveItem.quantityReceived > 0) {
        await applyStockMovement(tx, {
          organisationId: caller.organisationId,
          branchId: transfer.toBranchId,
          productId: transferItem.productId,
          batchId: transferItem.batchId,
          quantityDelta: receiveItem.quantityReceived,
          movementType: StockMovementType.TRANSFER_IN,
          performedByUserId: caller.id,
          referenceType: "transfer",
          referenceId: transferId,
        });
      }

      await tx.stockTransferItem.update({
        where: { id: transferItem.id },
        data: { quantityReceived: receiveItem.quantityReceived },
      });
    }

    const allItems = await tx.stockTransferItem.findMany({ where: { transferId } });
    const fullyReceived = allItems.every((i) => i.quantityReceived === i.quantitySent);

    await tx.stockTransfer.update({
      where: { id: transferId },
      data: { status: fullyReceived ? TransferStatus.RECEIVED : TransferStatus.PARTIALLY_RECEIVED },
    });
  });

  await refreshBranchDashboard(transfer.toBranchId);

  const updated = await prisma.stockTransfer.findUniqueOrThrow({
    where: { id: transferId },
    include: { items: true },
  });
  return { transfer: updated };
});
