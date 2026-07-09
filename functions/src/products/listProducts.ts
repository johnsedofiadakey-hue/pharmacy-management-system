import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listProducts = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.VIEW,
  });

  const products = await prisma.product.findMany({
    where: { organisationId: caller.organisationId },
    orderBy: { name: "asc" },
  });

  return { products };
});
