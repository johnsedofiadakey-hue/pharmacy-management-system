import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

const schema = z.object({ customerId: z.string().uuid() });

/**
 * Org-wide by design — queried by customerId alone, no branch filter. Any
 * pharmacist anywhere in the org can see a patient's full clinical history,
 * per the continuity-of-care decision (see schema comment above
 * PatientProfile).
 */
export const getPatientRecord = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PATIENTS,
    action: PermissionAction.VIEW,
  });

  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer || customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Customer not found in this organisation.");
  }

  const patientProfile = await prisma.patientProfile.findUnique({
    where: { customerId: customer.id },
    include: {
      vitals: { orderBy: { recordedAt: "desc" } },
      consultations: { orderBy: { consultationDate: "desc" }, include: { pharmacist: true, branch: true } },
      carePlans: { include: { followups: true, createdByPharmacist: true } },
    },
  });

  return { customer, patientProfile };
});
