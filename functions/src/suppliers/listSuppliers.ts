import { onCall } from "../lib/onCall";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

// Any-branch check, same reasoning as listProducts — the supplier directory
// isn't branch-scoped data, and branch-scoped procurement/branch-manager
// roles need it despite their SUPPLIERS:VIEW grant being scoped to a branch.
export const listSuppliers = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.SUPPLIERS,
    action: PermissionAction.VIEW,
  });

  const suppliers = await prisma.supplier.findMany({
    where: { organisationId: caller.organisationId },
    orderBy: { companyName: "asc" },
  });

  return { suppliers };
});
