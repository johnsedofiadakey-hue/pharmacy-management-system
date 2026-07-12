import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, TillSessionStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const openTillSchema = z.object({
  branchId: z.string().uuid(),
  openingFloat: z.number().nonnegative(),
});

export const openTill = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = openTillSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId, openingFloat } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.SALES,
    action: PermissionAction.CREATE,
  });

  const existingOpen = await prisma.tillSession.findFirst({
    where: { branchId, cashierUserId: caller.id, status: TillSessionStatus.OPEN },
  });
  if (existingOpen) {
    throw new HttpsError("already-exists", "You already have an open till session at this branch.");
  }

  const tillSession = await prisma.tillSession.create({
    data: { branchId, cashierUserId: caller.id, openingFloat },
  });

  return { tillSession };
});
