import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, BatchRecallStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const schema = z.object({ batchId: z.string().uuid(), reason: z.string().min(1) });

/**
 * Org-wide action (branchId: null) — a recall affects a batch everywhere it
 * exists, not one branch's decision. Blocks further sale by setting
 * Batch.recallStatus, which deductStockFefo checks on every sale/order.
 */
export const initiateDrugRecall = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { batchId, reason } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.STOCK,
    action: PermissionAction.APPROVE,
  });

  const batch = await prisma.batch.findUnique({ where: { id: batchId }, include: { product: true } });
  if (!batch || batch.product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Batch not found in this organisation.");
  }
  if (batch.recallStatus === BatchRecallStatus.RECALLED) {
    throw new HttpsError("already-exists", "This batch already has an active recall.");
  }

  const recall = await prisma.$transaction(async (tx) => {
    await tx.batch.update({ where: { id: batchId }, data: { recallStatus: BatchRecallStatus.RECALLED } });

    const created = await tx.drugRecall.create({
      data: {
        organisationId: caller.organisationId,
        batchId,
        reason,
        initiatedByUserId: caller.id,
      },
    });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "DRUG_RECALL_INITIATED",
      resourceType: "Batch",
      resourceId: batchId,
      newValue: { reason, recallId: created.id },
    });

    return created;
  });

  return { recall };
});
