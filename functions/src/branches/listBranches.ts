import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listBranches = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.BRANCHES,
    action: PermissionAction.VIEW,
  });

  const branches = await prisma.branch.findMany({
    where: { organisationId: caller.organisationId },
    orderBy: { name: "asc" },
  });

  return { branches };
});
