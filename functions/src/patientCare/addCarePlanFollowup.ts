import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

const schema = z.object({
  carePlanId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
  notes: z.string().optional(),
});

export const addCarePlanFollowup = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.CARE_PLANS,
    action: PermissionAction.EDIT,
  });

  const carePlan = await prisma.carePlan.findUnique({
    where: { id: input.carePlanId },
    include: { patientProfile: { include: { customer: true } } },
  });
  if (!carePlan || carePlan.patientProfile.customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Care plan not found.");
  }

  const followup = await prisma.carePlanFollowup.create({
    data: {
      carePlanId: input.carePlanId,
      scheduledDate: new Date(input.scheduledDate),
      notes: input.notes,
    },
  });

  return { followup };
});
