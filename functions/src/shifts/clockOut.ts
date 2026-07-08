import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";

const clockOutSchema = z.object({
  shiftId: z.string().uuid(),
});

export const clockOut = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = clockOutSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const shift = await prisma.shift.findUnique({ where: { id: parsed.data.shiftId } });
  if (!shift || shift.userId !== caller.id) {
    throw new HttpsError("not-found", "Shift not found.");
  }
  if (shift.clockOutAt) {
    throw new HttpsError("failed-precondition", "Shift is already clocked out.");
  }

  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: { clockOutAt: new Date() },
  });

  return { shift: updated };
});
