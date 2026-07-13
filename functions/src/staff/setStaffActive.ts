import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { auth } from "../admin";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const schema = z.object({
  targetUserId: z.string().uuid(),
  isActive: z.boolean(),
});

export const setStaffActive = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { targetUserId, isActive } = parsed.data;

  if (caller.id === targetUserId && !isActive) {
    throw new HttpsError("failed-precondition", "You cannot deactivate your own account.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.EMPLOYEES,
    action: PermissionAction.EDIT,
  });

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Staff member not found in this organisation.");
  }

  await auth.updateUser(target.firebaseUid, { disabled: !isActive });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({ where: { id: targetUserId }, data: { isActive } });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: isActive ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
      resourceType: "User",
      resourceId: targetUserId,
      oldValue: { isActive: target.isActive },
      newValue: { isActive },
    });

    return result;
  });

  return { user: updated };
});
