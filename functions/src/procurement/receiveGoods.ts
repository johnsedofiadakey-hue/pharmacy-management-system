import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import {
  prisma,
  PermissionResource,
  PermissionAction,
  PurchaseOrderStatus,
  StockMovementType,
} from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "../inventory/ledger";

const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().uuid(),
        batchNumber: z.string().min(1),
        receivedQuantity: z.number().int().positive(),
        expiryDate: z.string().datetime().optional(),
        manufacturingDate: z.string().datetime().optional(),
        actualCost: z.number().nonnegative().optional(),
      })
    )
    .min(1),
});

const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.SENT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

/**
 * Goods receiving with discrepancy detection (BLUEPRINT.md §24: "Ordered:
 * 100, Received: 96 ⚠ Discrepancy"). Supports successive partial receipts —
 * quantityReceived on each line accumulates across multiple calls, and the
 * order stays PARTIALLY_RECEIVED until every line's cumulative received
 * quantity matches what was ordered. Discrepancies are surfaced in the
 * response for the caller to act on, not auto-resolved (BLUEPRINT.md §24:
 * "discrepancies should require resolution").
 */
export const receiveGoods = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = receiveGoodsSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: { items: true },
  });
  if (!po || po.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Purchase order not found.");
  }
  if (!RECEIVABLE_STATUSES.includes(po.status)) {
    throw new HttpsError("failed-precondition", "Purchase order is not in a receivable state.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: po.branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.CREATE,
  });

  const poItemsById = new Map(po.items.map((i) => [i.id, i]));
  const discrepancies: Array<{ productId: string; ordered: number; received: number }> = [];

  await prisma.$transaction(async (tx) => {
    for (const receiveItem of input.items) {
      const poItem = poItemsById.get(receiveItem.purchaseOrderItemId);
      if (!poItem || poItem.purchaseOrderId !== po.id) {
        throw new HttpsError("not-found", `Purchase order item ${receiveItem.purchaseOrderItemId} not found.`);
      }

      const batch = await tx.batch.upsert({
        where: { productId_batchNumber: { productId: poItem.productId, batchNumber: receiveItem.batchNumber } },
        create: {
          productId: poItem.productId,
          batchNumber: receiveItem.batchNumber,
          expiryDate: receiveItem.expiryDate ? new Date(receiveItem.expiryDate) : undefined,
          manufacturingDate: receiveItem.manufacturingDate ? new Date(receiveItem.manufacturingDate) : undefined,
          costPriceAtReceipt: receiveItem.actualCost ?? poItem.unitCost,
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
        },
        update: {
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
        },
      });

      await applyStockMovement(tx, {
        organisationId: caller.organisationId,
        branchId: po.branchId,
        productId: poItem.productId,
        batchId: batch.id,
        quantityDelta: receiveItem.receivedQuantity,
        movementType: StockMovementType.PURCHASE_RECEIVED,
        performedByUserId: caller.id,
        referenceType: "purchase_order",
        referenceId: po.id,
      });

      const newReceivedTotal = poItem.quantityReceived + receiveItem.receivedQuantity;
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { quantityReceived: newReceivedTotal },
      });

      if (newReceivedTotal !== poItem.quantityOrdered) {
        discrepancies.push({
          productId: poItem.productId,
          ordered: poItem.quantityOrdered,
          received: newReceivedTotal,
        });
      }
    }

    const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const fullyReceived = allItems.every((i) => i.quantityReceived === i.quantityOrdered);

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED,
      },
    });
  });

  const updated = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: po.id },
    include: { items: true },
  });

  return { purchaseOrder: updated, discrepancies };
});
