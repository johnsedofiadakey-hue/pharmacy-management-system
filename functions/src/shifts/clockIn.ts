import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";

const clockInSchema = z.object({
  branchId: z.string().uuid(),
});

/**
 * Self-service — any staff member with a role at this branch (or an org-wide
 * role) can clock themselves in. Not gated by the resource/action permission
 * matrix since it isn't really a business-data action, just attendance.
 */
export const clockIn = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = clockInSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const hasRoleHere = await prisma.userRole.findFirst({
    where: { userId: caller.id, OR: [{ branchId: null }, { branchId }] },
  });
  if (!hasRoleHere) {
    throw new HttpsError("permission-denied", "You have no role assigned at this branch.");
  }

  const openShift = await prisma.shift.findFirst({
    where: { userId: caller.id, branchId, clockOutAt: null },
  });
  if (openShift) {
    throw new HttpsError("already-exists", "You are already clocked in at this branch.");
  }

  const shift = await prisma.shift.create({ data: { userId: caller.id, branchId } });
  return { shift };
});
