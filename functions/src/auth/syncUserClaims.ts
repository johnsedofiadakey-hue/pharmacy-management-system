import { HttpsError, onCall } from "firebase-functions/v2/https";
import { prisma } from "@pharmacy-os/db";
import { computeAndSyncClaims } from "./claims";

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

  const callerRoles = (request.auth.token.roles as string[] | undefined) ?? [];
  const isSelf = targetUser.firebaseUid === request.auth.uid;
  const isSuperAdmin = callerRoles.includes("super_admin");

  if (!isSelf && !isSuperAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only Super Admin can resync another user's claims."
    );
  }

  await computeAndSyncClaims(userId);

  return { success: true };
});
