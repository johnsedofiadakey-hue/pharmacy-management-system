import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listStaffMembers = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.EMPLOYEES,
    action: PermissionAction.VIEW,
  });

  const users = await prisma.user.findMany({
    where: { organisationId: caller.organisationId },
    include: {
      primaryBranch: { select: { id: true, name: true } },
      userRoles: {
        include: {
          role: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      primaryBranchId: user.primaryBranchId,
      primaryBranch: user.primaryBranch,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      userRoles: user.userRoles.map((userRole) => ({
        id: userRole.id,
        branchId: userRole.branchId,
        branch: userRole.branch,
        role: userRole.role,
      })),
    })),
  };
});
