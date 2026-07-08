import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, Prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

// Fields captured on branch creation, per BLUEPRINT.md §4 / the original blueprint §4.
const createBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
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

export const createBranch = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.BRANCHES,
    action: PermissionAction.CREATE,
  });

  const parsed = createBranchSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  const existing = await prisma.branch.findUnique({
    where: { organisationId_code: { organisationId: caller.organisationId, code: input.code } },
  });
  if (existing) {
    throw new HttpsError("already-exists", `Branch code "${input.code}" is already in use.`);
  }

  const branch = await prisma.branch.create({
    data: {
      organisationId: caller.organisationId,
      name: input.name,
      code: input.code,
      phone: input.phone,
      email: input.email,
      gpsLat: input.gpsLat,
      gpsLng: input.gpsLng,
      digitalAddress: input.digitalAddress,
      physicalAddress: input.physicalAddress,
      openingHours: input.openingHours as Prisma.InputJsonValue | undefined,
      pharmacyLicenceNumber: input.pharmacyLicenceNumber,
      licenceExpiryDate: input.licenceExpiryDate ? new Date(input.licenceExpiryDate) : undefined,
      nhisStatus: input.nhisStatus,
      deliveryCoverageArea: input.deliveryCoverageArea as Prisma.InputJsonValue | undefined,
      defaultWarehouseId: input.defaultWarehouseId,
      clinicalCareEnabled: input.clinicalCareEnabled ?? false,
    },
  });

  return { branch };
});
