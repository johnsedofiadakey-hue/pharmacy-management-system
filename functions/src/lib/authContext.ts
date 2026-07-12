import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { prisma, type User } from "@pharmacy-os/db";

/**
 * Resolves a Firebase Auth caller to their Postgres `users` row — the single
 * entry point every staff-facing Cloud Function uses before touching data.
 * Client-side custom claims are never trusted for authorization (BLUEPRINT.md
 * §4 architecture rule); this re-resolves identity server-side on every call.
 *
 * Reconstructed after the original was lost to a too-broad `lib/` gitignore
 * rule, from the Phase 1 build log's contract and every call site's usage.
 */
export async function getCallerUser(request: CallableRequest): Promise<User> {
  const firebaseUid = request.auth?.uid;
  if (!firebaseUid) {
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  }

  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) {
    throw new HttpsError("permission-denied", "No staff account is linked to this login.");
  }
  if (!user.isActive) {
    throw new HttpsError("permission-denied", "This staff account has been deactivated.");
  }

  return user;
}
