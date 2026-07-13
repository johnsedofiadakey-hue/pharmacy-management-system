import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

export const listBranchDeliveryRiders = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.DELIVERIES,
    action: PermissionAction.EDIT,
  });

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const riders = await prisma.user.findMany({
    where: {
      organisationId: caller.organisationId,
      isActive: true,
      userRoles: {
        some: {
          OR: [{ branchId }, { branchId: null }],
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
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      primaryBranchId: true,
      userRoles: {
        where: { OR: [{ branchId }, { branchId: null }] },
        select: {
          branchId: true,
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return { riders };
});
