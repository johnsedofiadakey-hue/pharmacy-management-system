import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { computeAndSyncClaims } from "../auth/claims";

const assignUserRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  roleId: z.string().uuid(),
  // null = org-wide grant (e.g. Super Admin, Head Office Admin).
  branchId: z.string().uuid().nullable(),
});

/**
 * Grants a role to a user, scoped to a branch (or org-wide if branchId is null).
 * This is what makes "one account, two roles" possible — calling this twice with
 * the same targetUserId/branchId but different roleId adds a second UserRole row
 * rather than replacing the first (e.g. Branch Manager + Superintendent Pharmacist
 * on the same account, per BLUEPRINT.md §5).
 */
export const assignUserRole = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = assignUserRoleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { targetUserId, roleId, branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.EMPLOYEES,
    action: PermissionAction.EDIT,
  });

  const [targetUser, role, branch] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId } }),
    prisma.role.findUnique({ where: { id: roleId } }),
    branchId ? prisma.branch.findUnique({ where: { id: branchId } }) : null,
  ]);

  if (!targetUser || targetUser.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Target user not found in this organisation.");
  }
  if (!role || (role.organisationId !== null && role.organisationId !== caller.organisationId)) {
    throw new HttpsError("not-found", "Role not found in this organisation.");
  }
  if (branchId && (!branch || branch.organisationId !== caller.organisationId)) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  // Prisma's compound-unique `where` shorthand doesn't accept `null` for a nullable
  // key field at the type level (a known limitation, not a runtime one — the query
  // engine handles `IS NULL` correctly). Cast to satisfy the type, matches the
  // pattern used in prisma/seed.ts for Role's nullable organisationId key.
  const userRole = await prisma.userRole.upsert({
    where: {
      userId_roleId_branchId: {
        userId: targetUserId,
        roleId,
        branchId: branchId as unknown as string,
      },
    },
    create: { userId: targetUserId, roleId, branchId },
    update: {},
  });

  await computeAndSyncClaims(targetUserId);

  return { userRole };
});
