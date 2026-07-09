import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listNhisClaims = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.SALES,
    action: PermissionAction.VIEW,
  });

  const claims = await prisma.nhisClaim.findMany({
    where: { organisationId: caller.organisationId },
    include: { customer: true, sale: true },
    orderBy: { createdAt: "desc" },
  });

  return { claims };
});
