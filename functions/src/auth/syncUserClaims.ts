import { HttpsError, onCall } from "firebase-functions/v2/https";
import { PermissionAction, PermissionResource, prisma } from "@pharmacy-os/db";
import { computeAndSyncClaims } from "./claims";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

/**
 * Manual/admin-triggered re-sync of a user's claims + Firestore mirror doc.
 * The primary sync path is `computeAndSyncClaims` called directly by the
 * role-assignment mutation (Phase 1) right after it writes to `user_roles` —
 * this callable exists for support/debugging and initial provisioning.
 *
 * NOTE: this is a placeholder guard. Full permission-matrix enforcement
 * (role_permissions lookup) lands in Phase 1; for now this only checks that
 * the caller is either resyncing themselves or already carries the
 * `super_admin` role claim.
 */
export const syncUserClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }

  const { userId } = request.data as { userId: string };
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new HttpsError("not-found", "User not found.");
  }

  const caller = await getCallerUser(request);
  const isSelf = targetUser.firebaseUid === request.auth.uid;

  if (!isSelf) {
    await requirePermission({
      userId: caller.id,
      organisationId: caller.organisationId,
      branchId: null,
      resource: PermissionResource.SETTINGS,
      action: PermissionAction.EDIT,
    });
    if (targetUser.organisationId !== caller.organisationId) {
      throw new HttpsError("not-found", "User not found in this organisation.");
    }
  }

  await computeAndSyncClaims(userId);

  return { success: true };
});
