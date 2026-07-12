import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const setBranchActiveSchema = z.object({
  branchId: z.string().uuid(),
  isActive: z.boolean(),
});

/**
 * Deactivate (or reactivate) a branch. Gated behind BRANCHES:DELETE — per
 * BLUEPRINT.md §3, "the Super Admin should be the only default role able to
 * create or deactivate branches," and only super_admin holds that grant in the
 * seeded roles. This is a soft toggle, never a row deletion (BLUEPRINT.md §53).
 */
export const setBranchActive = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = setBranchActiveSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, isActive } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.BRANCHES,
    action: PermissionAction.DELETE,
  });

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: { isActive },
  });

  await recordAuditLog(prisma, {
    organisationId: caller.organisationId,
    branchId,
    userId: caller.id,
    action: isActive ? "BRANCH_REACTIVATED" : "BRANCH_DEACTIVATED",
    resourceType: "Branch",
    resourceId: branchId,
    oldValue: { isActive: branch.isActive },
    newValue: { isActive },
  });

  return { branch: updated };
});
