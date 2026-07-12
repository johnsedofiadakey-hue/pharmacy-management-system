import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "./ledger";
import { isSensitiveAdjustment } from "./adjustmentPolicy";

// Reason codes from BLUEPRINT.md §19. "Other" isn't a separate movement type —
// callers pick the closest fit and use `note` for the specifics. Manual
// adjustments always target one known batch (unlike FEFO sale deduction,
// which spreads across batches automatically) — see fefo.ts.
const ADJUSTMENT_TYPES = [
  StockMovementType.ADJUSTMENT_DAMAGE,
  StockMovementType.ADJUSTMENT_EXPIRY,
  StockMovementType.ADJUSTMENT_LOSS,
  StockMovementType.ADJUSTMENT_THEFT,
  StockMovementType.ADJUSTMENT_COUNTING,
  StockMovementType.ADJUSTMENT_CORRECTION,
] as const;

const adjustStockSchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid(),
  quantityDelta: z.number().int().refine((n) => n !== 0, "quantityDelta must not be zero"),
  movementType: z.enum(ADJUSTMENT_TYPES),
  note: z.string().optional(),
});

/**
 * Manual stock adjustment against a specific batch, with a required reason
 * code. Sensitive adjustments (THEFT/LOSS, or large magnitude — see
 * adjustmentPolicy.ts) don't touch branch_stock immediately: they create a
 * StockAdjustmentRequest for a Branch Manager to review
 * (reviewStockAdjustmentRequest.ts), per BLUEPRINT.md §19's
 * request → review → approve/reject workflow. Everything else applies
 * immediately via applyStockMovement, same as Phase 2.
 */
export const adjustStock = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = adjustStockSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: input.branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.EDIT,
  });

  const batch = await prisma.batch.findUnique({ where: { id: input.batchId } });
  if (!batch || batch.productId !== input.productId) {
    throw new HttpsError("not-found", "Batch not found for this product.");
  }

  if (isSensitiveAdjustment(input.movementType, input.quantityDelta)) {
    const stockAdjustmentRequest = await prisma.stockAdjustmentRequest.create({
      data: {
        organisationId: caller.organisationId,
        branchId: input.branchId,
        productId: input.productId,
        batchId: input.batchId,
        quantityDelta: input.quantityDelta,
        movementType: input.movementType,
        note: input.note,
        requestedByUserId: caller.id,
      },
    });
    return { pendingApproval: true, stockAdjustmentRequest };
  }

  const movement = await prisma.$transaction((tx) =>
    applyStockMovement(tx, {
      organisationId: caller.organisationId,
      branchId: input.branchId,
      productId: input.productId,
      batchId: input.batchId,
      quantityDelta: input.quantityDelta,
      movementType: input.movementType,
      performedByUserId: caller.id,
      reason: input.note,
    })
  );

  return { pendingApproval: false, movement };
});
