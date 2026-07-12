import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import {
  prisma,
  PermissionResource,
  PermissionAction,
  PrescriptionStatus,
  PrescriptionItemAvailability,
} from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const reviewPrescriptionSchema = z.object({
  prescriptionId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_CLARIFICATION"]),
  items: z
    .array(
      z.object({
        prescriptionItemId: z.string().uuid(),
        productId: z.string().uuid().optional(),
        availabilityStatus: z.nativeEnum(PrescriptionItemAvailability),
        note: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * The pharmacist review step — this IS the substitution approval
 * (BLUEPRINT.md §13): setting productId to something other than what the
 * requestedText implies, done by a PRESCRIPTIONS:APPROVE holder (only
 * superintendent_pharmacist in the seed data), with reviewedByPharmacistId
 * and reviewedAt recorded, is the whole substitution decision and its audit
 * trail — no separate substitution-request entity exists.
 */
export const reviewPrescription = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = reviewPrescriptionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { prescriptionId, decision, items } = parsed.data;

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { items: true },
  });
  if (!prescription || prescription.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Prescription not found.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: prescription.branchId,
    resource: PermissionResource.PRESCRIPTIONS,
    action: PermissionAction.APPROVE,
  });

  const itemsById = new Map(prescription.items.map((i) => [i.id, i]));

  await prisma.$transaction(async (tx) => {
    for (const reviewedItem of items ?? []) {
      const item = itemsById.get(reviewedItem.prescriptionItemId);
      if (!item || item.prescriptionId !== prescriptionId) {
        throw new HttpsError("not-found", `Prescription item ${reviewedItem.prescriptionItemId} not found.`);
      }
      await tx.prescriptionItem.update({
        where: { id: item.id },
        data: {
          productId: reviewedItem.productId,
          availabilityStatus: reviewedItem.availabilityStatus,
          note: reviewedItem.note,
        },
      });
    }

    let newStatus: PrescriptionStatus;
    if (decision === "REJECT") {
      newStatus = PrescriptionStatus.REJECTED;
    } else if (decision === "REQUEST_CLARIFICATION") {
      newStatus = PrescriptionStatus.CLARIFICATION_REQUIRED;
    } else {
      const allItems = await tx.prescriptionItem.findMany({ where: { prescriptionId } });
      const allAvailable = allItems.every(
        (i) => i.availabilityStatus === PrescriptionItemAvailability.AVAILABLE
      );
      const anyAvailable = allItems.some(
        (i) =>
          i.availabilityStatus === PrescriptionItemAvailability.AVAILABLE ||
          i.availabilityStatus === PrescriptionItemAvailability.PARTIALLY_AVAILABLE
      );
      newStatus = allAvailable
        ? PrescriptionStatus.APPROVED
        : anyAvailable
          ? PrescriptionStatus.PARTIALLY_AVAILABLE
          : PrescriptionStatus.REJECTED;
    }

    await tx.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: newStatus,
        reviewedByPharmacistId: caller.id,
        reviewedAt: new Date(),
      },
    });
  });

  const updated = await prisma.prescription.findUniqueOrThrow({
    where: { id: prescriptionId },
    include: { items: true },
  });

  return { prescription: updated };
});
