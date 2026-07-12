import { onCall } from "../lib/onCall";
import { prisma, TillSessionStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";

/**
 * The caller's currently-open till session and shift, if any. Lets the POS
 * and branch dashboard rehydrate after a page refresh instead of forgetting
 * an open till that is still open server-side. Self-scoped (cashier sees
 * only their own session), so no resource/action permission gate — same
 * reasoning as clockIn.
 */
export const getActiveTillSession = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const [tillSession, shift] = await Promise.all([
    prisma.tillSession.findFirst({
      where: {
        cashierUserId: caller.id,
        status: TillSessionStatus.OPEN,
        branch: { organisationId: caller.organisationId },
      },
      orderBy: { openedAt: "desc" },
    }),
    prisma.shift.findFirst({
      where: {
        userId: caller.id,
        clockOutAt: null,
        branch: { organisationId: caller.organisationId },
      },
      orderBy: { clockInAt: "desc" },
    }),
  ]);

  return { tillSession, shift };
});
