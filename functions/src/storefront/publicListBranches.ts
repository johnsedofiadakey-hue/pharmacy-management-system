import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";

const schema = z.object({ organisationId: z.string().uuid() });

/** Public — branch picker for checkout/pickup selection. No auth: staff's listBranches requires a User row, which a customer doesn't have. */
export const publicListBranches = onCall({ invoker: "public" }, async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const branches = await prisma.branch.findMany({
    where: { organisationId: parsed.data.organisationId, isActive: true },
    select: { id: true, name: true, physicalAddress: true, phone: true, gpsLat: true, gpsLng: true },
    orderBy: { name: "asc" },
  });

  return { branches };
});
