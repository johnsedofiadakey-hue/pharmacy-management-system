import { onCall } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction, FollowupStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

/**
 * Org-wide "what's due" list — the pharmacist caseload view from
 * BLUEPRINT.md's Phase 8 goal. There's no patient-to-pharmacist assignment
 * concept modeled (no such data exists to assign from yet), so this is
 * honestly "every due follow-up any pharmacist in the org should see," not a
 * per-pharmacist queue — consistent with clinical data being org-wide.
 */
export const listUpcomingFollowups = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.CARE_PLANS,
    action: PermissionAction.VIEW,
  });

  const followups = await prisma.carePlanFollowup.findMany({
    where: {
      status: FollowupStatus.DUE,
      carePlan: { patientProfile: { customer: { organisationId: caller.organisationId } } },
    },
    include: {
      carePlan: { include: { patientProfile: { include: { customer: true } } } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return { followups };
});
