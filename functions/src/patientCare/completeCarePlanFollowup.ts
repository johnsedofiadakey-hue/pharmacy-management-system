import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, FollowupStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

const schema = z.object({
  followupId: z.string().uuid(),
  notes: z.string().optional(),
});

export const completeCarePlanFollowup = onCall(async (request) => {
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

  const followup = await prisma.carePlanFollowup.findUnique({
    where: { id: input.followupId },
    include: { carePlan: { include: { patientProfile: { include: { customer: true } } } } },
  });
  if (!followup || followup.carePlan.patientProfile.customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Follow-up not found.");
  }

  const updated = await prisma.carePlanFollowup.update({
    where: { id: input.followupId },
    data: { status: FollowupStatus.COMPLETED, completedAt: new Date(), notes: input.notes ?? followup.notes },
  });

  return { followup: updated };
});
