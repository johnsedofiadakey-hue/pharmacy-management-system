import { onCall } from "../lib/onCall";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

// Any-branch check: the product catalogue itself isn't branch-scoped data
// (branch_stock is), and every branch-scoped role (cashier, pharmacy
// technician, branch manager...) needs it for POS/pharmacist/procurement
// pages even though their PRODUCTS:VIEW grant is scoped to their own branch.
export const listProducts = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.VIEW,
  });

  const products = await prisma.product.findMany({
    where: { organisationId: caller.organisationId },
    orderBy: { name: "asc" },
  });

  return { products };
});
