import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource, StockMovementType } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";
import { getProductDisplay } from "../lib/productDisplay";
import { applyStockMovement } from "./ledger";

const schema = z.object({
  branchId: z.string().uuid(),
});

export const clearShowcaseBranchStock = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.EDIT,
  });

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const stockRows = await prisma.branchStock.findMany({
    where: { branchId, quantityOnHand: { gt: 0 } },
    include: { batch: { include: { product: true } } },
  });
  const showcaseRows = stockRows.filter((row) => getProductDisplay(row.batch.product.taxConfig).isShowcase);

  if (showcaseRows.length === 0) {
    return { clearedBatches: 0, clearedUnits: 0 };
  }

  const clearedUnits = showcaseRows.reduce((sum, row) => sum + row.quantityOnHand, 0);

  await prisma.$transaction(async (tx) => {
    for (const row of showcaseRows) {
      await applyStockMovement(tx, {
        organisationId: caller.organisationId,
        branchId,
        productId: row.productId,
        batchId: row.batchId,
        quantityDelta: -row.quantityOnHand,
        movementType: StockMovementType.ADJUSTMENT_CORRECTION,
        performedByUserId: caller.id,
        reason: "Cleared showcase seed stock from branch workspace.",
        referenceType: "showcase_seed_cleanup",
      });
    }

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      branchId,
      userId: caller.id,
      action: "SHOWCASE_BRANCH_STOCK_CLEARED",
      resourceType: "BranchStock",
      resourceId: branchId,
      oldValue: { clearedBatches: showcaseRows.length, clearedUnits },
      newValue: { clearedBatches: 0, clearedUnits: 0 },
    });
  });

  return { clearedBatches: showcaseRows.length, clearedUnits };
});
