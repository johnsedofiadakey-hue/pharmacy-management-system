import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

export const listAdverseReactionReports = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PATIENTS,
    action: PermissionAction.VIEW,
  });

  const reports = await prisma.adverseReactionReport.findMany({
    where: { organisationId: caller.organisationId },
    include: { product: true, batch: true, customer: true, reportedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return { reports };
});
