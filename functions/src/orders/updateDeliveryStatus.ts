import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, DeliveryStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  deliveryId: z.string().uuid(),
  status: z.nativeEnum(DeliveryStatus),
});

/**
 * A Delivery Rider has "access only to assigned deliveries" (BLUEPRINT.md
 * §5) — so this allows the update either via the normal DELIVERIES:EDIT
 * grant (a branch manager reassigning/correcting) or, failing that, if the
 * caller is literally the rider this delivery is assigned to.
 */
export const updateDeliveryStatus = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { deliveryId, status } = parsed.data;

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  });
  if (!delivery) {
    throw new HttpsError("not-found", "Delivery not found.");
  }

  if (delivery.riderId !== caller.id) {
    await requirePermission({
      userId: caller.id,
    organisationId: caller.organisationId,
    branchId: delivery.order.branchId,
      resource: PermissionResource.DELIVERIES,
      action: PermissionAction.EDIT,
    });
  }

  const updated = await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status,
      deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : undefined,
    },
  });

  if (status === DeliveryStatus.DELIVERED) {
    await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
  }

  return { delivery: updated };
});
