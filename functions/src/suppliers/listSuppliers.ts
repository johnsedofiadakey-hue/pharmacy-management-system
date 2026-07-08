import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listSuppliers = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.SUPPLIERS,
    action: PermissionAction.VIEW,
  });

  const suppliers = await prisma.supplier.findMany({
    where: { organisationId: caller.organisationId },
    orderBy: { companyName: "asc" },
  });

  return { suppliers };
});
