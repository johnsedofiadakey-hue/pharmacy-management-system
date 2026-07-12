import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, PrescriptionStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  branchId: z.string().uuid(),
  pendingOnly: z.boolean().optional(),
});

const PENDING_STATUSES: PrescriptionStatus[] = [
  PrescriptionStatus.RECEIVED,
  PrescriptionStatus.UNDER_REVIEW,
  PrescriptionStatus.CLARIFICATION_REQUIRED,
];

export const listPrescriptions = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, pendingOnly } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.PRESCRIPTIONS,
    action: PermissionAction.VIEW,
  });

  const prescriptions = await prisma.prescription.findMany({
    where: { branchId, ...(pendingOnly ? { status: { in: PENDING_STATUSES } } : {}) },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { createdAt: "desc" },
  });

  return { prescriptions };
});
