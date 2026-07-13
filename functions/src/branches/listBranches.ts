import { onCall } from "../lib/onCall";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

// Any-branch check, not org-wide-only: this just lists the org's branch
// directory (names/addresses) for pickers on every branch-scoped page —
// a cashier or branch manager whose grant is scoped to their own branch
// still needs this to select that branch in the first place. Contrast with
// genuinely org-wide-only actions (e.g. listAuditLog, initiateDrugRecall),
// which correctly require an org-wide grant via requirePermission(branchId: null).
export const listBranches = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.BRANCHES,
    action: PermissionAction.VIEW,
  });

  const hasOrgWideBranchView = await prisma.userRole.findFirst({
    where: {
      userId: caller.id,
      branchId: null,
      role: {
        rolePermissions: {
          some: { permission: { resource: PermissionResource.BRANCHES, action: PermissionAction.VIEW } },
        },
      },
    },
    select: { id: true },
  });

  const branches = await prisma.branch.findMany({
    where: {
      organisationId: caller.organisationId,
      ...(hasOrgWideBranchView
        ? {}
        : {
            userRoles: { some: { userId: caller.id } },
          }),
    },
    orderBy: { name: "asc" },
  });

  return {
    branches: branches.map((branch) => ({
      ...branch,
      isShowcase: branch.code.startsWith("SHOW-") || branch.code.startsWith("DEMO-"),
    })),
  };
});
