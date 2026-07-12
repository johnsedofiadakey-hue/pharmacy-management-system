import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { refreshBranchDashboard } from "./refreshBranchDashboard";

const schema = z.object({ branchId: z.string().uuid() });

/** Manual/testing trigger — the real path is the automatic call after createSale/closeTill/reviewStockAdjustmentRequest. */
export const requestDashboardRefresh = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: parsed.data.branchId,
    resource: PermissionResource.REPORTS,
    action: PermissionAction.VIEW,
  });

  await refreshBranchDashboard(parsed.data.branchId);
  return { success: true };
});
