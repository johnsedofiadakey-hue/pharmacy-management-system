import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

export const listTransfers = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.VIEW,
  });

  const transfers = await prisma.stockTransfer.findMany({
    where: { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] },
    include: { items: { include: { batch: { include: { product: true } } } }, fromBranch: true, toBranch: true },
    orderBy: { createdAt: "desc" },
  });

  return { transfers };
});
