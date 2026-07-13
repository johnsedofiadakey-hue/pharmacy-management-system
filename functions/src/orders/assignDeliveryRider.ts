import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, DeliveryStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ orderId: z.string().uuid(), riderId: z.string().uuid() });

export const assignDeliveryRider = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { orderId, riderId } = parsed.data;

  const [order, rider] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.user.findUnique({ where: { id: riderId } }),
  ]);
  if (!order) {
    throw new HttpsError("not-found", "Order not found.");
  }
  if (!rider || rider.organisationId !== order.organisationId) {
    throw new HttpsError("not-found", "Rider not found in this organisation.");
  }
  if (!rider.isActive) {
    throw new HttpsError("failed-precondition", "This rider account is inactive.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: order.branchId,
    resource: PermissionResource.DELIVERIES,
    action: PermissionAction.EDIT,
  });

  const riderGrant = await prisma.userRole.findFirst({
    where: {
      userId: rider.id,
      OR: [{ branchId: order.branchId }, { branchId: null }],
      role: {
        rolePermissions: {
          some: {
            permission: {
              resource: PermissionResource.DELIVERIES,
              action: PermissionAction.VIEW,
            },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!riderGrant) {
    throw new HttpsError("failed-precondition", "Selected staff member is not a delivery rider for this branch.");
  }

  const delivery = await prisma.delivery.update({
    where: { orderId },
    data: { riderId, status: DeliveryStatus.ASSIGNED, assignedAt: new Date() },
  });

  return { delivery };
});
