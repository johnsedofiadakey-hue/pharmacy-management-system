import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

const schema = z.object({ phone: z.string().min(1) });

/** Customers aren't branch-owned, same reasoning as patient records — any branch role with CUSTOMERS:VIEW can look one up. */
export const findCustomerByPhone = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.CUSTOMERS,
    action: PermissionAction.VIEW,
  });

  const customer = await prisma.customer.findUnique({
    where: { organisationId_phone: { organisationId: caller.organisationId, phone: parsed.data.phone } },
  });

  return { customer };
});
