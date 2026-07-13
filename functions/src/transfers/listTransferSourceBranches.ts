import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ toBranchId: z.string().uuid() });

/**
 * Branch-scoped staff should only see their assigned branch in the normal
 * workspace switcher, but transfer requests need an intentional source branch
 * directory. Access is granted by TRANSFERS:CREATE at the destination branch.
 */
export const listTransferSourceBranches = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { toBranchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: toBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.CREATE,
  });

  const toBranch = await prisma.branch.findUnique({ where: { id: toBranchId } });
  if (!toBranch || toBranch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Destination branch not found in this organisation.");
  }

  const branches = await prisma.branch.findMany({
    where: {
      organisationId: caller.organisationId,
      isActive: true,
      id: { not: toBranchId },
    },
    orderBy: { name: "asc" },
  });

  return { branches };
});
