import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  sourceBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
});

/**
 * Returns source-branch stock for a transfer request. This deliberately checks
 * TRANSFERS:CREATE at the destination branch instead of STOCK:VIEW at the
 * source branch; otherwise a branch manager could request stock only from
 * branches they already manage, defeating inter-branch transfers.
 */
export const listTransferSourceStock = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { sourceBranchId, toBranchId } = parsed.data;

  if (sourceBranchId === toBranchId) {
    throw new HttpsError("invalid-argument", "Source and destination branch must differ.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: toBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.CREATE,
  });

  const [sourceBranch, toBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: sourceBranchId } }),
    prisma.branch.findUnique({ where: { id: toBranchId } }),
  ]);

  if (!sourceBranch || sourceBranch.organisationId !== caller.organisationId || !sourceBranch.isActive) {
    throw new HttpsError("not-found", "Source branch not found in this organisation.");
  }
  if (!toBranch || toBranch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Destination branch not found in this organisation.");
  }

  const stock = await prisma.branchStock.findMany({
    where: { branchId: sourceBranchId, quantityOnHand: { gt: 0 } },
    include: { batch: { include: { product: true } } },
    orderBy: { batch: { expiryDate: { sort: "asc", nulls: "last" } } },
  });

  return { stock };
});
