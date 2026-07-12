import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";

const schema = z.object({
  label: z.string().min(1),
  addressText: z.string().min(1),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
});

export const addCustomerAddress = onCall(async (request) => {
  const customer = await getCallerCustomer(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const address = await prisma.customerAddress.create({
    data: { customerId: customer.id, ...parsed.data },
  });

  return { address };
});
