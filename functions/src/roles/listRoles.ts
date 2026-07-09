import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

/** System default roles (organisationId null) plus this org's custom roles. */
export const listRoles = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.EMPLOYEES,
    action: PermissionAction.VIEW,
  });

  const roles = await prisma.role.findMany({
    where: { OR: [{ organisationId: null }, { organisationId: caller.organisationId }] },
    orderBy: { name: "asc" },
  });

  return { roles };
});
