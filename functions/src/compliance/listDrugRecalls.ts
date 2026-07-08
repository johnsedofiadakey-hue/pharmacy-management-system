import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

export const listDrugRecalls = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.STOCK,
    action: PermissionAction.VIEW,
  });

  const recalls = await prisma.drugRecall.findMany({
    where: { organisationId: caller.organisationId },
    include: { batch: { include: { product: true } }, initiatedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return { recalls };
});
