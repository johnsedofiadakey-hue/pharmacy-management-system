import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import {
  prisma,
  PermissionResource,
  PermissionAction,
  TillSessionStatus,
  SaleStatus,
  PaymentMethod,
} from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";

const closeTillSchema = z.object({
  tillSessionId: z.string().uuid(),
  closingActual: z.number().nonnegative(),
});

/**
 * Expected cash = opening float + cash payments on completed sales in this
 * session. No manager-approval gate on the variance itself yet — closing
 * always succeeds and just records whatever variance results. Flagging large
 * variances for review is a natural next step (same shape as the
 * StockAdjustmentRequest workflow this phase added), just not built yet.
 */
export const closeTill = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = closeTillSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { tillSessionId, closingActual } = parsed.data;

  const tillSession = await prisma.tillSession.findUnique({ where: { id: tillSessionId } });
  if (!tillSession) {
    throw new HttpsError("not-found", "Till session not found.");
  }
  if (tillSession.status !== TillSessionStatus.OPEN) {
    throw new HttpsError("failed-precondition", "Till session is already closed.");
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: tillSession.branchId,
    resource: PermissionResource.SALES,
    action: PermissionAction.EDIT,
  });

  const cashPayments = await prisma.salePayment.findMany({
    where: {
      paymentMethod: PaymentMethod.CASH,
      sale: { tillSessionId, status: SaleStatus.COMPLETED },
    },
  });
  const cashTotal = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const closingExpected = Number(tillSession.openingFloat) + cashTotal;
  const variance = closingActual - closingExpected;

  const updated = await prisma.tillSession.update({
    where: { id: tillSessionId },
    data: {
      status: TillSessionStatus.CLOSED,
      closingExpected,
      closingActual,
      variance,
      closedAt: new Date(),
      closedByUserId: caller.id,
    },
  });

  await refreshBranchDashboard(tillSession.branchId);

  return { tillSession: updated };
});
