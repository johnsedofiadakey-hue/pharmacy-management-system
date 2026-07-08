import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

/**
 * Org-wide (branchId: null) — an auditor's role is a plain org-wide grant
 * (VIEW+EXPORT on every resource, per the seed data), so this is consistent
 * with getCompanyDashboard/getBranchBenchmarking's gate.
 */
export const listAuditLog = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  const entries = await prisma.auditLog.findMany({
    where: { organisationId: caller.organisationId },
    include: { user: true, branch: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return { entries };
});
