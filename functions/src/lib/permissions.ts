import { HttpsError } from "firebase-functions/v2/https";
import { prisma, type PermissionResource, type PermissionAction } from "@pharmacy-os/db";

/**
 * The single enforcement point for the resource × action permission matrix
 * (Phase 1). A grant lives in `user_roles`: `branchId = null` is an org-wide
 * grant (Super Admin, Head Office Admin), a non-null `branchId` scopes the
 * role to that branch. Rules:
 *
 * - `branchId: null` check (org-level action) → only an org-wide grant passes.
 * - branch-scoped check → an org-wide grant OR a grant at that branch passes.
 *
 * Throws `permission-denied` otherwise. Never trusts client-provided claims.
 */
export async function requirePermission(input: {
  userId: string;
  organisationId: string;
  branchId: string | null;
  resource: PermissionResource;
  action: PermissionAction;
}): Promise<void> {
  const { userId, organisationId, branchId, resource, action } = input;

  const grant = await prisma.userRole.findFirst({
    where: {
      userId,
      user: { organisationId },
      OR: branchId === null ? [{ branchId: null }] : [{ branchId: null }, { branchId }],
      role: {
        rolePermissions: { some: { permission: { resource, action } } },
      },
    },
    select: { id: true },
  });

  if (!grant) {
    throw new HttpsError(
      "permission-denied",
      `You do not have ${resource}:${action} permission${branchId ? " at this branch" : ""}.`
    );
  }
}

/**
 * Passes if the user holds the permission at ANY branch (or org-wide). Used
 * for org-wide clinical data (patients, care plans, adverse reactions) where
 * continuity of care deliberately crosses branch boundaries (BLUEPRINT.md §5).
 */
export async function requirePermissionAnyBranch(input: {
  userId: string;
  resource: PermissionResource;
  action: PermissionAction;
}): Promise<void> {
  const { userId, resource, action } = input;

  const grant = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        rolePermissions: { some: { permission: { resource, action } } },
      },
    },
    select: { id: true },
  });

  if (!grant) {
    throw new HttpsError("permission-denied", `You do not have ${resource}:${action} permission.`);
  }
}
