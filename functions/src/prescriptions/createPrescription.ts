import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const createPrescriptionSchema = z.object({
  branchId: z.string().uuid(),
  customerPhone: z.string().min(1),
  uploadedFileUrl: z.string().optional(),
  items: z
    .array(z.object({ requestedText: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
});

/**
 * Staff-entered intake — a customer walks in with a paper prescription and
 * staff logs what's on it. Customer self-upload from a storefront is Phase 9
 * scope (no public-facing site exists yet); this is the same underlying
 * Prescription record either way, just a different entry point.
 */
export const createPrescription = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = createPrescriptionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: input.branchId,
    resource: PermissionResource.PRESCRIPTIONS,
    action: PermissionAction.CREATE,
  });

  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const customer = await prisma.customer.upsert({
    where: { organisationId_phone: { organisationId: caller.organisationId, phone: input.customerPhone } },
    create: { organisationId: caller.organisationId, phone: input.customerPhone },
    update: {},
  });

  const prescription = await prisma.prescription.create({
    data: {
      organisationId: caller.organisationId,
      branchId: input.branchId,
      customerId: customer.id,
      uploadedFileUrl: input.uploadedFileUrl,
      items: {
        create: input.items.map((item) => ({
          requestedText: item.requestedText,
          quantity: item.quantity,
        })),
      },
    },
    include: { items: true },
  });

  return { prescription };
});
