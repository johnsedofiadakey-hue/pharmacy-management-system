import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "./ledger";

const receiveStockSchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  batchNumber: z.string().min(1),
  quantity: z.number().int().positive(),
  expiryDate: z.string().datetime().optional(),
  manufacturingDate: z.string().datetime().optional(),
  costPriceAtReceipt: z.number().optional(),
});

/**
 * Receives stock into a specific batch (creating the batch if it's new for this
 * product), then records the PURCHASE_RECEIVED movement — batch creation and
 * the ledger entry happen in one transaction so they can't drift apart.
 * No purchaseOrderId/supplierId yet — those link up in Phase 6.
 */
export const receiveStock = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = receiveStockSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId: input.branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.CREATE,
  });

  const [product, branch] = await Promise.all([
    prisma.product.findUnique({ where: { id: input.productId } }),
    prisma.branch.findUnique({ where: { id: input.branchId } }),
  ]);
  if (!product || product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Product not found in this organisation.");
  }
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const movement = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.upsert({
      where: { productId_batchNumber: { productId: input.productId, batchNumber: input.batchNumber } },
      create: {
        productId: input.productId,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        manufacturingDate: input.manufacturingDate ? new Date(input.manufacturingDate) : undefined,
        costPriceAtReceipt: input.costPriceAtReceipt,
      },
      update: {},
    });

    return applyStockMovement(tx, {
      organisationId: caller.organisationId,
      branchId: input.branchId,
      productId: input.productId,
      batchId: batch.id,
      quantityDelta: input.quantity,
      movementType: StockMovementType.PURCHASE_RECEIVED,
      performedByUserId: caller.id,
    });
  });

  return { movement };
});
