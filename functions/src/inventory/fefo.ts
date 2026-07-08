import { HttpsError } from "firebase-functions/v2/https";
import { Prisma, StockMovementType } from "@pharmacy-os/db";
import { applyStockMovement } from "./ledger";

type TxClient = Prisma.TransactionClient;

/**
 * First-Expiry-First-Out deduction (BLUEPRINT.md §15): picks batches at this
 * branch ordered by nearest expiry first, deducting across as many as needed
 * to satisfy the requested quantity. Batches with no tracked expiry sort last
 * (consumed only after every dated batch is exhausted).
 *
 * Used by Phase 3's POS sale flow; also directly usable now for any
 * FEFO-ordered consumption (transfers dispatch, etc. in later phases).
 */
export async function deductStockFefo(
  tx: TxClient,
  params: {
    organisationId: string;
    branchId: string;
    productId: string;
    quantity: number;
    movementType: StockMovementType;
    performedByUserId: string;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
  }
) {
  if (params.quantity <= 0) {
    throw new HttpsError("invalid-argument", "Quantity must be positive.");
  }

  const availableStock = await tx.branchStock.findMany({
    where: { branchId: params.branchId, productId: params.productId, quantityOnHand: { gt: 0 } },
    include: { batch: true },
    orderBy: { batch: { expiryDate: { sort: "asc", nulls: "last" } } },
  });

  let remaining = params.quantity;
  const movements = [];

  for (const stock of availableStock) {
    if (remaining <= 0) break;
    const deduct = Math.min(remaining, stock.quantityOnHand);

    const movement = await applyStockMovement(tx, {
      organisationId: params.organisationId,
      branchId: params.branchId,
      productId: params.productId,
      batchId: stock.batchId,
      quantityDelta: -deduct,
      movementType: params.movementType,
      performedByUserId: params.performedByUserId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason,
    });

    movements.push(movement);
    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new HttpsError(
      "failed-precondition",
      `Insufficient stock for product ${params.productId} at this branch: short by ${remaining}.`
    );
  }

  return movements;
}
