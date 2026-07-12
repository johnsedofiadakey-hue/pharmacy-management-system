import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, Prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const updateBranchSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  digitalAddress: z.string().optional(),
  physicalAddress: z.string().optional(),
  openingHours: z.record(z.string(), z.unknown()).optional(),
  pharmacyLicenceNumber: z.string().optional(),
  licenceExpiryDate: z.string().datetime().optional(),
  nhisStatus: z.string().optional(),
  deliveryCoverageArea: z.record(z.string(), z.unknown()).optional(),
  defaultWarehouseId: z.string().uuid().optional(),
  clinicalCareEnabled: z.boolean().optional(),
});

export const updateBranch = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = updateBranchSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, ...updates } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.BRANCHES,
    action: PermissionAction.EDIT,
  });

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: {
      ...updates,
      openingHours: updates.openingHours as Prisma.InputJsonValue | undefined,
      deliveryCoverageArea: updates.deliveryCoverageArea as Prisma.InputJsonValue | undefined,
      licenceExpiryDate: updates.licenceExpiryDate ? new Date(updates.licenceExpiryDate) : undefined,
    },
  });

  return { branch: updated };
});
