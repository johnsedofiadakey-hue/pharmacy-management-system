import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, OrderStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.nativeEnum(OrderStatus),
});

// Forward-only transitions, plus CANCELLED from any non-terminal state.
const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PICKING, OrderStatus.CANCELLED],
  PICKING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export const updateOrderStatus = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { orderId, newStatus } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new HttpsError("not-found", "Order not found.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: order.branchId,
    resource: PermissionResource.ORDERS,
    action: PermissionAction.EDIT,
  });

  if (!ALLOWED_NEXT[order.status].includes(newStatus)) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot move an order from ${order.status} to ${newStatus}.`
    );
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });

  return { order: updated };
});
