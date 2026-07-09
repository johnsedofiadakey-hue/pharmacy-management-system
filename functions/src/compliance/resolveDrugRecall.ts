import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, BatchRecallStatus, RecallStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const schema = z.object({ recallId: z.string().uuid() });

export const resolveDrugRecall = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.STOCK,
    action: PermissionAction.APPROVE,
  });

  const recall = await prisma.drugRecall.findUnique({ where: { id: parsed.data.recallId } });
  if (!recall || recall.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Recall not found.");
  }
  if (recall.status !== RecallStatus.ACTIVE) {
    throw new HttpsError("failed-precondition", "Recall is already resolved.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.batch.update({
      where: { id: recall.batchId },
      data: { recallStatus: BatchRecallStatus.RESOLVED },
    });

    const result = await tx.drugRecall.update({
      where: { id: recall.id },
      data: { status: RecallStatus.RESOLVED, resolvedAt: new Date() },
    });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "DRUG_RECALL_RESOLVED",
      resourceType: "Batch",
      resourceId: recall.batchId,
      oldValue: { recallId: recall.id },
    });

    return result;
  });

  return { recall: updated };
});
