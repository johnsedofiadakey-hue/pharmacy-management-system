import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, ApprovalStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { applyStockMovement } from "./ledger";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";
import { recordAuditLog } from "../lib/auditLog";

const reviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export const reviewStockAdjustmentRequest = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = reviewSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { requestId, decision, note } = parsed.data;

  const adjustmentRequest = await prisma.stockAdjustmentRequest.findUnique({
    where: { id: requestId },
  });
  if (!adjustmentRequest || adjustmentRequest.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Adjustment request not found.");
  }
  if (adjustmentRequest.status !== ApprovalStatus.PENDING) {
    throw new HttpsError("failed-precondition", "This request has already been reviewed.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: adjustmentRequest.branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.APPROVE,
  });

  if (decision === "REJECTED") {
    const updated = await prisma.stockAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.REJECTED,
        reviewedByUserId: caller.id,
        reviewedAt: new Date(),
        note: note ?? adjustmentRequest.note,
      },
    });
    await recordAuditLog(prisma, {
      organisationId: caller.organisationId,
      branchId: adjustmentRequest.branchId,
      userId: caller.id,
      action: "STOCK_ADJUSTMENT_REJECTED",
      resourceType: "StockAdjustmentRequest",
      resourceId: requestId,
    });
    return { stockAdjustmentRequest: updated };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await applyStockMovement(tx, {
      organisationId: adjustmentRequest.organisationId,
      branchId: adjustmentRequest.branchId,
      productId: adjustmentRequest.productId,
      batchId: adjustmentRequest.batchId,
      quantityDelta: adjustmentRequest.quantityDelta,
      movementType: adjustmentRequest.movementType,
      performedByUserId: adjustmentRequest.requestedByUserId,
      approvedByUserId: caller.id,
      approvalStatus: ApprovalStatus.APPROVED,
      reason: adjustmentRequest.note ?? undefined,
    });

    const result = await tx.stockAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewedByUserId: caller.id,
        reviewedAt: new Date(),
      },
    });

    await recordAuditLog(tx, {
      organisationId: adjustmentRequest.organisationId,
      branchId: adjustmentRequest.branchId,
      userId: caller.id,
      action: "STOCK_ADJUSTMENT_APPROVED",
      resourceType: "StockAdjustmentRequest",
      resourceId: requestId,
      newValue: { quantityDelta: adjustmentRequest.quantityDelta, movementType: adjustmentRequest.movementType },
    });

    return result;
  });

  await refreshBranchDashboard(adjustmentRequest.branchId);

  return { stockAdjustmentRequest: updated };
});
