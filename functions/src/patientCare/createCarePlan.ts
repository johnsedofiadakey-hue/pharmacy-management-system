import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";
import { ensurePatientProfile } from "./ensurePatientProfile";

const createCarePlanSchema = z.object({
  customerId: z.string().uuid(),
  condition: z.string().min(1),
  goals: z.string().optional(),
  firstFollowupDate: z.string().datetime().optional(),
});

/**
 * No clinicalCareEnabled branch gate here — a care plan isn't tied to one
 * branch (continuity of care spans branches by design, see the schema
 * comment above PatientProfile), so there's no single branch to check it
 * against. That gate applies to recordVitals/createConsultation instead,
 * which do happen at a specific branch.
 */
export const createCarePlan = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = createCarePlanSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.CARE_PLANS,
    action: PermissionAction.CREATE,
  });

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer || customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Customer not found in this organisation.");
  }

  const patientProfile = await ensurePatientProfile(customer.id);

  const carePlan = await prisma.carePlan.create({
    data: {
      patientProfileId: patientProfile.id,
      createdByPharmacistId: caller.id,
      condition: input.condition,
      goals: input.goals,
      followups: input.firstFollowupDate
        ? { create: [{ scheduledDate: new Date(input.firstFollowupDate) }] }
        : undefined,
    },
    include: { followups: true },
  });

  return { carePlan };
});
