import { HttpsError } from "firebase-functions/v2/https";
import { Prisma, StockMovementType, ApprovalStatus } from "@pharmacy-os/db";

type TxClient = Prisma.TransactionClient;

/**
 * The single point where branch_stock and stock_movements ever change, together,
 * atomically (BLUEPRINT.md §18-19). branch_stock is a cached current balance —
 * it is NEVER written outside of this function. stock_movements is the
 * append-only ledger and the actual source of truth.
 *
 * Must be called inside an existing `prisma.$transaction(...)` — this function
 * does not open its own transaction, so callers can combine a movement with
 * other writes (e.g. creating a batch first) atomically.
 */
export async function applyStockMovement(
  tx: TxClient,
  params: {
    organisationId: string;
    branchId: string;
    productId: string;
    batchId: string;
    quantityDelta: number;
    movementType: StockMovementType;
    // Exactly one of these two — see the schema comment on StockMovement.
    // Staff-initiated movements (POS, receiving, adjustments, transfers) set
    // performedByUserId; customer-initiated ones (an online order,
    // placeOrder.ts) set performedByCustomerId instead.
    performedByUserId?: string;
    performedByCustomerId?: string;
    approvedByUserId?: string | null;
    approvalStatus?: ApprovalStatus;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
  }
) {
  if (!params.performedByUserId && !params.performedByCustomerId) {
    throw new HttpsError(
      "invalid-argument",
      "A stock movement must have either performedByUserId or performedByCustomerId."
    );
  }

  const branchStock = await tx.branchStock.upsert({
    where: { branchId_batchId: { branchId: params.branchId, batchId: params.batchId } },
    create: {
      branchId: params.branchId,
      productId: params.productId,
      batchId: params.batchId,
      quantityOnHand: 0,
    },
    update: {},
  });

  const previousBalance = branchStock.quantityOnHand;
  const newBalance = previousBalance + params.quantityDelta;

  if (newBalance < 0) {
    throw new HttpsError(
      "failed-precondition",
      `Insufficient stock in batch ${params.batchId}: have ${previousBalance}, requested ${-params.quantityDelta}.`
    );
  }

  await tx.branchStock.update({
    where: { id: branchStock.id },
    data: { quantityOnHand: newBalance },
  });

  return tx.stockMovement.create({
    data: {
      organisationId: params.organisationId,
      branchId: params.branchId,
      productId: params.productId,
      batchId: params.batchId,
      movementType: params.movementType,
      quantityDelta: params.quantityDelta,
      previousBalance,
      newBalance,
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      performedByUserId: params.performedByUserId,
      performedByCustomerId: params.performedByCustomerId,
      approvedByUserId: params.approvedByUserId ?? undefined,
      approvalStatus: params.approvalStatus ?? ApprovalStatus.NOT_REQUIRED,
    },
  });
}
