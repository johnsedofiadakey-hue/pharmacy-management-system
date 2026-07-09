import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const listSalesSchema = z.object({
  branchId: z.string().uuid(),
  tillSessionId: z.string().uuid().optional(),
});

export const listSales = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = listSalesSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, tillSessionId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.SALES,
    action: PermissionAction.VIEW,
  });

  const sales = await prisma.sale.findMany({
    where: { branchId, ...(tillSessionId ? { tillSessionId } : {}) },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return { sales };
});
