import { prisma } from "@pharmacy-os/db";
import { auth, firestore } from "../admin";

/**
 * Firebase custom claims stay deliberately small (token size limit is ~1000 bytes,
 * and a Regional Manager could be scoped to dozens of branches). Claims only carry
 * orgId + deduped role names, enough for coarse client-side UI gating (e.g. "show
 * the Super Admin nav"). The full branch list lives in the `users/{uid}` Firestore
 * mirror doc instead, which the client can read via a real-time listener.
 *
 * Real authorization never trusts either of these — every Cloud Function re-checks
 * role_permissions in Postgres before allowing a write. See BLUEPRINT.md §4.
 */
export async function computeAndSyncClaims(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true, branch: true },
      },
    },
  });

  const roleNames = [...new Set(user.userRoles.map((ur) => ur.role.name))];
  const branchIds = [
    ...new Set(
      user.userRoles
        .map((ur) => ur.branchId)
        .filter((id): id is string => id !== null)
    ),
  ];

  await auth.setCustomUserClaims(user.firebaseUid, {
    orgId: user.organisationId,
    roles: roleNames,
  });

  await firestore
    .collection("users")
    .doc(user.firebaseUid)
    .set(
      {
        orgId: user.organisationId,
        name: user.name,
        primaryBranchId: user.primaryBranchId ?? null,
        branchIds,
        roles: user.userRoles.map((ur) => ({
          roleId: ur.roleId,
          roleName: ur.role.name,
          branchId: ur.branchId,
        })),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}
