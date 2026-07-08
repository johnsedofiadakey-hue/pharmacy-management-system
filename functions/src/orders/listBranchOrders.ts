import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, OrderStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  branchId: z.string().uuid(),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const listBranchOrders = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, status } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.ORDERS,
    action: PermissionAction.VIEW,
  });

  const orders = await prisma.order.findMany({
    where: { branchId, ...(status ? { status } : {}) },
    include: {
      items: { include: { product: true } },
      payments: true,
      delivery: true,
      customer: true,
      deliveryAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { orders };
});
