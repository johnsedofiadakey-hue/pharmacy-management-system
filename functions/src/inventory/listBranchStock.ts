import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const listBranchStockSchema = z.object({
  branchId: z.string().uuid(),
});

export const listBranchStock = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = listBranchStockSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.STOCK,
    action: PermissionAction.VIEW,
  });

  const stock = await prisma.branchStock.findMany({
    where: { branchId, quantityOnHand: { gt: 0 } },
    include: { batch: { include: { product: true } } },
    orderBy: { batch: { expiryDate: { sort: "asc", nulls: "last" } } },
  });

  return { stock };
});
